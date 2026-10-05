/**
 * Authentication flow against a real PostgreSQL.
 * Requires `pnpm docker:up` and `pnpm db:migration:run` beforehand.
 *
 * Every user created here uses an `e2e-<uuid>@nexus.test` address and is
 * deleted in afterAll (sessions cascade), so the dev database stays clean.
 */
import { randomUUID } from 'node:crypto';
import { type INestApplication } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import type { AuthResponse, RefreshResponse, UserResponse } from '@nexus/types';
import request from 'supertest';
import { type App } from 'supertest/types';
import { DataSource } from 'typeorm';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';
import { TokenService } from '../src/auth/token.service';

const PASSWORD = 'correct horse battery staple';
const E2E_EMAIL_PATTERN = 'e2e-%@nexus.test';
const newEmail = () => `e2e-${randomUUID()}@nexus.test`;

describe('Auth (e2e)', () => {
  let app: INestApplication<App>;
  let dataSource: DataSource;
  const http = () => request(app.getHttpServer());

  const register = async (email = newEmail()) => {
    const res = await http()
      .post('/api/auth/register')
      .send({ email, password: PASSWORD })
      .expect(201);
    return res.body as AuthResponse;
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    configureApp(app);
    await app.init();
    dataSource = app.get(DataSource);
  });

  afterAll(async () => {
    await dataSource
      .createQueryBuilder()
      .delete()
      .from('users')
      .where('email LIKE :pattern', { pattern: E2E_EMAIL_PATTERN })
      .execute();
    await app.close();
  });

  it('full flow: register → login → me → refresh → me → logout → old token rejected', async () => {
    const email = newEmail();

    // Register
    const registered = await register(email.toUpperCase());
    expect(registered.user.email).toBe(email);

    // Login
    const login = await http()
      .post('/api/auth/login')
      .send({ email, password: PASSWORD })
      .expect(200);
    const session = login.body as AuthResponse;
    expect(session.user).toEqual(registered.user);

    // /me with the access token
    const me = await http()
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${session.accessToken}`)
      .expect(200);
    expect(me.body).toEqual(registered.user);

    // Refresh (rotation)
    const refreshed = await http()
      .post('/api/auth/refresh')
      .send({ refreshToken: session.refreshToken })
      .expect(200);
    const rotated = refreshed.body as RefreshResponse;
    expect(Object.keys(rotated).sort()).toEqual([
      'accessToken',
      'refreshToken',
    ]);
    expect(rotated.refreshToken).not.toBe(session.refreshToken);

    // New access token works
    await http()
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${rotated.accessToken}`)
      .expect(200);

    // Logout revokes the current refresh session
    await http()
      .post('/api/auth/logout')
      .send({ refreshToken: rotated.refreshToken })
      .expect(204);

    // Neither the logged-out token nor the earlier rotated one works
    for (const refreshToken of [rotated.refreshToken, session.refreshToken]) {
      const res = await http()
        .post('/api/auth/refresh')
        .send({ refreshToken })
        .expect(401);
      expect(res.body).toMatchObject({ message: 'Invalid refresh token.' });
    }
  });

  describe('responses never leak credentials', () => {
    it('register, login and me contain no hash or extra fields', async () => {
      const email = newEmail();
      const registered = await register(email);
      const login = await http()
        .post('/api/auth/login')
        .send({ email, password: PASSWORD })
        .expect(200);
      const me = await http()
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${registered.accessToken}`)
        .expect(200);

      for (const user of [
        registered.user,
        (login.body as AuthResponse).user,
        me.body as UserResponse,
      ]) {
        expect(Object.keys(user).sort()).toEqual([
          'createdAt',
          'email',
          'id',
          'updatedAt',
        ]);
      }
      const all = JSON.stringify([registered, login.body, me.body]);
      expect(all).not.toMatch(/argon2|passwordHash|password_hash|tokenHash/);
      expect(all).not.toContain(PASSWORD);
    });

    it('the database stores a hash, not the password or refresh token', async () => {
      const { user, refreshToken } = await register();
      const [row] = (await dataSource.query(
        'SELECT password_hash FROM users WHERE id = $1',
        [user.id],
      )) as { password_hash: string }[];
      const sessions = (await dataSource.query(
        'SELECT token_hash FROM refresh_sessions WHERE user_id = $1',
        [user.id],
      )) as { token_hash: string }[];

      expect(row!.password_hash).toMatch(/^\$argon2id\$/);
      expect(sessions).toHaveLength(1);
      expect(sessions[0]!.token_hash).toBe(
        app.get(TokenService).hashToken(refreshToken),
      );
      expect(sessions[0]!.token_hash).not.toBe(refreshToken);
    });
  });

  describe('registration', () => {
    it('rejects a duplicate email (case-insensitive) with 409', async () => {
      const email = newEmail();
      await register(email);

      const res = await http()
        .post('/api/auth/register')
        .send({ email: ` ${email.toUpperCase()} `, password: PASSWORD })
        .expect(409);
      expect(res.body).toMatchObject({
        statusCode: 409,
        message: 'Email is already registered.',
      });
    });

    it.each([
      [{ email: 'not-an-email', password: PASSWORD }],
      [{ email: newEmail(), password: 'short' }],
      [{ email: newEmail(), password: 'x'.repeat(129) }],
      [{ email: newEmail() }],
      [{ email: newEmail(), password: PASSWORD, role: 'admin' }],
    ])('rejects malformed input %p with 400', async (body) => {
      await http().post('/api/auth/register').send(body).expect(400);
    });

    it('rejects a malformed JSON body with 400', async () => {
      await http()
        .post('/api/auth/register')
        .set('Content-Type', 'application/json')
        .send('{"email":')
        .expect(400);
    });
  });

  describe('login', () => {
    it('returns the same 401 for a wrong password and an unknown email', async () => {
      const email = newEmail();
      await register(email);

      const wrongPassword = await http()
        .post('/api/auth/login')
        .send({ email, password: 'not the password' })
        .expect(401);
      const unknownEmail = await http()
        .post('/api/auth/login')
        .send({ email: newEmail(), password: PASSWORD })
        .expect(401);

      expect(wrongPassword.body).toEqual({
        statusCode: 401,
        message: 'Invalid email or password.',
        error: 'Unauthorized',
      });
      expect(unknownEmail.body).toEqual(wrongPassword.body);
    });
  });

  describe('protected routes', () => {
    it('rejects /me without a token', async () => {
      await http().get('/api/auth/me').expect(401);
    });

    it('rejects /me with an invalid token', async () => {
      await http()
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalid.token.value')
        .expect(401);
    });

    it('rejects /me with a refresh token in place of an access token', async () => {
      const { refreshToken } = await register();
      await http()
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${refreshToken}`)
        .expect(401);
    });
  });

  describe('refresh tokens', () => {
    it('rejects an invalid refresh token with 401', async () => {
      await http()
        .post('/api/auth/refresh')
        .send({ refreshToken: 'garbage' })
        .expect(401);
    });

    it('rejects a missing refresh token with 400', async () => {
      await http().post('/api/auth/refresh').send({}).expect(400);
    });

    it('reuse of a rotated token revokes every session of that user', async () => {
      const { refreshToken, user } = await register();
      const rotated = (
        await http()
          .post('/api/auth/refresh')
          .send({ refreshToken })
          .expect(200)
      ).body as RefreshResponse;

      // Replay of the old token
      await http().post('/api/auth/refresh').send({ refreshToken }).expect(401);

      // The legitimately rotated token was revoked as well
      await http()
        .post('/api/auth/refresh')
        .send({ refreshToken: rotated.refreshToken })
        .expect(401);
      const [{ active }] = (await dataSource.query(
        'SELECT count(*)::int AS active FROM refresh_sessions WHERE user_id = $1 AND revoked_at IS NULL',
        [user.id],
      )) as [{ active: number }];
      expect(active).toBe(0);
    });

    it('allows only one of two concurrent refreshes with the same token', async () => {
      const { refreshToken } = await register();

      const results = await Promise.all([
        http().post('/api/auth/refresh').send({ refreshToken }),
        http().post('/api/auth/refresh').send({ refreshToken }),
      ]);

      expect(results.map((r) => r.status).sort()).toEqual([200, 401]);
    });

    it('rejects a revoked (logged-out) refresh token', async () => {
      const { refreshToken } = await register();
      await http().post('/api/auth/logout').send({ refreshToken }).expect(204);

      await http().post('/api/auth/refresh').send({ refreshToken }).expect(401);
    });
  });
});
