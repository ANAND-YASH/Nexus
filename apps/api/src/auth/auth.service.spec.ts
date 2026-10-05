import { Logger, UnauthorizedException } from '@nestjs/common';
import type { UsersService } from '../users/users.service';
import { AuthService } from './auth.service';
import { PasswordService } from './password.service';
import type { RefreshSessionsService } from './sessions/refresh-sessions.service';
import {
  createTokenService,
  InMemoryRefreshSessionsService,
  InMemoryUsersService,
  TEST_AUTH_ENV,
} from './testing/auth-test-utils';
import type { TokenService } from './token.service';
import type { JwtService } from '@nestjs/jwt';

const EMAIL = 'Ada@Example.com';
const PASSWORD = 'correct horse battery staple';

describe('AuthService', () => {
  let service: AuthService;
  let users: InMemoryUsersService;
  let sessions: InMemoryRefreshSessionsService;
  let passwords: PasswordService;
  let tokens: TokenService;
  let jwt: JwtService;

  beforeAll(async () => {
    passwords = new PasswordService();
    await passwords.onModuleInit();
  });

  beforeEach(() => {
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    users = new InMemoryUsersService();
    sessions = new InMemoryRefreshSessionsService();
    ({ tokens, jwt } = createTokenService());
    service = new AuthService(
      users as unknown as UsersService,
      passwords,
      tokens,
      sessions as unknown as RefreshSessionsService,
    );
  });

  afterEach(() => jest.restoreAllMocks());

  const register = () => service.register({ email: EMAIL, password: PASSWORD });

  describe('register', () => {
    it('creates the user and returns tokens', async () => {
      const result = await register();

      expect(result.user).toEqual({
        id: expect.any(String),
        email: 'ada@example.com',
        createdAt: expect.any(String),
        updatedAt: expect.any(String),
      });
      expect(await tokens.verifyAccessToken(result.accessToken)).toMatchObject({
        sub: result.user.id,
      });
      expect(sessions.active()).toHaveLength(1);
    });

    it('stores an argon2id hash, never the plaintext password', async () => {
      const { user } = await register();
      const stored = users.rows.get(user.id)!.passwordHash;

      expect(stored).not.toContain(PASSWORD);
      expect(stored).toMatch(/^\$argon2id\$v=19\$m=19456,t=2,p=1\$/);
      expect(await passwords.verify(stored, PASSWORD)).toBe(true);
    });

    it('never returns passwordHash', async () => {
      const result = await register();

      expect(result.user).not.toHaveProperty('passwordHash');
      expect(JSON.stringify(result)).not.toContain('$argon2');
    });

    it('rejects a duplicate email (case-insensitive) with 409', async () => {
      await register();

      await expect(
        service.register({ email: ' ADA@example.COM ', password: PASSWORD }),
      ).rejects.toMatchObject({ status: 409 });
    });
  });

  describe('login', () => {
    beforeEach(register);

    it('returns the user and tokens for valid credentials', async () => {
      const result = await service.login({
        email: 'ada@EXAMPLE.com',
        password: PASSWORD,
      });

      expect(result.user.email).toBe('ada@example.com');
      expect(result.user).not.toHaveProperty('passwordHash');
      expect(result.accessToken).toEqual(expect.any(String));
      expect(result.refreshToken).toEqual(expect.any(String));
    });

    it('rejects an incorrect password with a generic 401', async () => {
      await expect(
        service.login({ email: EMAIL, password: 'wrong password' }),
      ).rejects.toThrow(
        new UnauthorizedException('Invalid email or password.'),
      );
    });

    it('rejects an unknown email with the identical generic 401', async () => {
      const verifyDummy = jest.spyOn(passwords, 'verifyDummy');

      await expect(
        service.login({ email: 'nobody@example.com', password: PASSWORD }),
      ).rejects.toThrow(
        new UnauthorizedException('Invalid email or password.'),
      );
      // A hash is still computed, so timing doesn't reveal the email is unknown.
      expect(verifyDummy).toHaveBeenCalledTimes(1);
    });

    it('does not issue a session on failure', async () => {
      const before = sessions.rows.size;
      await service
        .login({ email: EMAIL, password: 'wrong password' })
        .catch(() => undefined);

      expect(sessions.rows.size).toBe(before);
    });
  });

  describe('refresh', () => {
    it('rotates: issues a new pair and revokes the old session', async () => {
      const { refreshToken } = await register();
      const oldSid = (await tokens.verifyRefreshToken(refreshToken)).sid;

      const next = await service.refresh(refreshToken);

      expect(next.refreshToken).not.toBe(refreshToken);
      expect((await tokens.verifyRefreshToken(next.refreshToken)).sid).not.toBe(
        oldSid,
      );
      expect(sessions.rows.get(oldSid)!.revokedAt).toBeInstanceOf(Date);
      expect(sessions.active()).toHaveLength(1);
      await expect(
        tokens.verifyAccessToken(next.accessToken),
      ).resolves.toBeDefined();
    });

    it('stores only a hash of the refresh token', async () => {
      const { refreshToken } = await register();
      const [row] = sessions.active();

      expect(row!.tokenHash).toBe(tokens.hashToken(refreshToken));
      expect(JSON.stringify([...sessions.rows.values()])).not.toContain(
        refreshToken,
      );
    });

    it('rejects reuse of a rotated token and revokes all sessions', async () => {
      const { refreshToken } = await register();
      const next = await service.refresh(refreshToken);

      await expect(service.refresh(refreshToken)).rejects.toThrow(
        UnauthorizedException,
      );
      // The legitimately rotated token is now dead too (theft response).
      expect(sessions.active()).toHaveLength(0);
      await expect(service.refresh(next.refreshToken)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('rejects a malformed token', async () => {
      await expect(service.refresh('not-a-token')).rejects.toThrow(
        new UnauthorizedException('Invalid refresh token.'),
      );
    });

    it('rejects a token signed with the wrong secret', async () => {
      const { user } = await register();
      const forged = await jwt.signAsync(
        { sub: user.id, sid: crypto.randomUUID() },
        {
          secret: 'x'.repeat(40),
          issuer: 'nexus-api',
          audience: 'nexus-api:refresh',
        },
      );

      await expect(service.refresh(forged)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('rejects an access token presented as a refresh token', async () => {
      const { accessToken } = await register();

      await expect(service.refresh(accessToken)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('rejects an expired refresh token', async () => {
      const { user } = await register();
      const [row] = sessions.active();
      const now = Math.floor(Date.now() / 1000);
      const expired = await jwt.signAsync(
        { sub: user.id, sid: row!.id, iat: now - 100, exp: now - 10 },
        {
          secret: TEST_AUTH_ENV.JWT_REFRESH_SECRET,
          issuer: 'nexus-api',
          audience: 'nexus-api:refresh',
        },
      );

      await expect(service.refresh(expired)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('rejects when the session itself has expired', async () => {
      const { refreshToken } = await register();
      sessions.active()[0]!.expiresAt = new Date(Date.now() - 1_000);

      await expect(service.refresh(refreshToken)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('rejects a token whose session does not exist', async () => {
      const { refreshToken } = await register();
      sessions.rows.clear();

      await expect(service.refresh(refreshToken)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('logout', () => {
    it('revokes the session so the refresh token cannot be used', async () => {
      const { refreshToken } = await register();

      await service.logout(refreshToken);

      expect(sessions.active()).toHaveLength(0);
      await expect(service.refresh(refreshToken)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('replaying a logged-out token revokes the other sessions too', async () => {
      const first = await register();
      const second = await service.login({ email: EMAIL, password: PASSWORD });
      await service.logout(first.refreshToken);

      await expect(service.refresh(first.refreshToken)).rejects.toThrow(
        UnauthorizedException,
      );
      expect(sessions.active()).toHaveLength(0);
      await expect(service.refresh(second.refreshToken)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('only revokes the presented session', async () => {
      const first = await register();
      await service.login({ email: EMAIL, password: PASSWORD });

      await service.logout(first.refreshToken);

      expect(sessions.active()).toHaveLength(1);
    });

    it('is idempotent for an already-revoked session', async () => {
      const { refreshToken } = await register();
      await service.logout(refreshToken);

      await expect(service.logout(refreshToken)).resolves.toBeUndefined();
    });

    it('rejects an invalid token', async () => {
      await expect(service.logout('garbage')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('me', () => {
    it('returns the safe user shape', async () => {
      const { user } = await register();

      const me = await service.me(user.id);

      expect(me).toEqual(user);
      expect(Object.keys(me).sort()).toEqual([
        'createdAt',
        'email',
        'id',
        'updatedAt',
      ]);
    });

    it('rejects a token for a user that no longer exists', async () => {
      await expect(service.me(crypto.randomUUID())).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });
});
