/**
 * End-to-end tests against a real PostgreSQL.
 * Requires `pnpm docker:up` and `pnpm db:migration:run` beforehand.
 * Health endpoints must stay public even though a global auth guard exists.
 */
import { type INestApplication } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import type { HealthResponse, LivenessResponse } from '@nexus/types';
import request from 'supertest';
import { type App } from 'supertest/types';
import { DataSource, QueryFailedError } from 'typeorm';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';
import { User } from '../src/users/user.entity';

describe('API (e2e)', () => {
  let app: INestApplication<App>;
  let dataSource: DataSource;

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
    await app?.close();
  });

  describe('health', () => {
    it('GET /api/health/live reports the API is running', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/health/live')
        .expect(200);

      expect((res.body as LivenessResponse).status).toBe('ok');
    });

    it('GET /api/health reports the database is reachable', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/health')
        .expect(200);
      const body = res.body as HealthResponse;

      expect(body.status).toBe('ok');
      expect(body.checks.api.status).toBe('up');
      expect(body.checks.database.status).toBe('up');
      // Only the probe result — no connection details or credentials.
      expect(Object.keys(body.checks.database).sort()).toEqual([
        'latencyMs',
        'status',
      ]);
      const serialized = JSON.stringify(body);
      expect(serialized).not.toContain(process.env.DATABASE_PASSWORD);
      expect(serialized).not.toContain(
        `${process.env.DATABASE_HOST}:${process.env.DATABASE_PORT}`,
      );
    });
  });

  describe('schema', () => {
    it('has no pending migrations', async () => {
      expect(await dataSource.showMigrations()).toBe(false);
    });

    it('enforces case-insensitive email uniqueness on users', async () => {
      const runner = dataSource.createQueryRunner();
      await runner.startTransaction();
      try {
        const users = runner.manager.getRepository(User);
        const created = await users.save(
          users.create({
            email: '  E2E.Test@Example.com ',
            passwordHash: 'not-a-real-hash',
          }),
        );

        expect(created.id).toMatch(/^[0-9a-f-]{36}$/);
        expect(created.email).toBe('e2e.test@example.com');
        await expect(
          users.findOneBy({ email: 'E2E.TEST@example.com' }),
        ).resolves.toMatchObject({ id: created.id });
        await expect(
          users.save(
            users.create({
              email: 'e2e.test@EXAMPLE.com',
              passwordHash: 'not-a-real-hash',
            }),
          ),
        ).rejects.toBeInstanceOf(QueryFailedError);
      } finally {
        await runner.rollbackTransaction();
        await runner.release();
      }
    });
  });

  it('closes the database connection on shutdown', async () => {
    await app.close();

    expect(dataSource.isInitialized).toBe(false);
  });
});
