/**
 * Test doubles for auth unit tests: real crypto (argon2, JWT), in-memory
 * persistence. Not imported by application code.
 */
import { ConflictException } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type { AuthEnv } from '../../config/env';
import { normalizeEmail, type User } from '../../users/user.entity';
import type { UsersService } from '../../users/users.service';
import type { RefreshSession } from '../sessions/refresh-session.entity';
import type {
  NewRefreshSession,
  RefreshSessionsService,
} from '../sessions/refresh-sessions.service';
import { TokenService } from '../token.service';

export const TEST_AUTH_ENV: AuthEnv = {
  JWT_ACCESS_SECRET: 'test-access-secret-0123456789abcdef0123456789',
  JWT_ACCESS_EXPIRES_IN: 900,
  JWT_REFRESH_SECRET: 'test-refresh-secret-0123456789abcdef012345678',
  JWT_REFRESH_EXPIRES_IN: 7 * 86_400,
};

export function createTokenService(env: AuthEnv = TEST_AUTH_ENV): {
  tokens: TokenService;
  jwt: JwtService;
} {
  const jwt = new JwtService({});
  const config = {
    get: (key: keyof AuthEnv) => env[key],
  } as unknown as ConfigService<AuthEnv, true>;
  return { tokens: new TokenService(jwt, config), jwt };
}

export class InMemoryUsersService implements Pick<
  UsersService,
  'findById' | 'findByEmailWithPassword' | 'create'
> {
  readonly rows = new Map<string, User>();

  findById(id: string): Promise<User | null> {
    const user = this.rows.get(id);
    if (!user) return Promise.resolve(null);
    // Mirror `select: false`: generic lookups never include the hash.
    const { passwordHash: _omitted, ...rest } = user;
    return Promise.resolve(rest as User);
  }

  findByEmailWithPassword(email: string): Promise<User | null> {
    const wanted = normalizeEmail(email);
    const user = [...this.rows.values()].find((u) => u.email === wanted);
    return Promise.resolve(user ? ({ ...user } as User) : null);
  }

  create(email: string, passwordHash: string): Promise<User> {
    const normalized = normalizeEmail(email);
    if ([...this.rows.values()].some((u) => u.email === normalized)) {
      return Promise.reject(
        new ConflictException('Email is already registered.'),
      );
    }
    const now = new Date();
    const user = {
      id: crypto.randomUUID(),
      email: normalized,
      passwordHash,
      createdAt: now,
      updatedAt: now,
    } as User;
    this.rows.set(user.id, user);
    return Promise.resolve({
      ...user,
      passwordHash: undefined,
    } as unknown as User);
  }
}

export class InMemoryRefreshSessionsService implements Pick<
  RefreshSessionsService,
  'findById' | 'create' | 'revokeIfActive' | 'revokeAllForUser'
> {
  readonly rows = new Map<string, RefreshSession>();

  findById(id: string): Promise<RefreshSession | null> {
    const row = this.rows.get(id);
    return Promise.resolve(row ? { ...row } : null);
  }

  create(session: NewRefreshSession): Promise<void> {
    this.rows.set(session.id, {
      ...session,
      createdAt: new Date(),
      revokedAt: null,
    });
    return Promise.resolve();
  }

  revokeIfActive(id: string): Promise<boolean> {
    const row = this.rows.get(id);
    if (!row || row.revokedAt || row.expiresAt <= new Date()) {
      return Promise.resolve(false);
    }
    row.revokedAt = new Date();
    return Promise.resolve(true);
  }

  revokeAllForUser(userId: string): Promise<void> {
    for (const row of this.rows.values()) {
      if (row.userId === userId && !row.revokedAt) row.revokedAt = new Date();
    }
    return Promise.resolve();
  }

  active(): RefreshSession[] {
    return [...this.rows.values()].filter((r) => !r.revokedAt);
  }
}
