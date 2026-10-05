import { createHash, timingSafeEqual } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type { AuthEnv } from '../config/env';
import type { AccessTokenPayload, RefreshTokenPayload } from './auth.types';

/** Pinned so a token can never select its own (e.g. `none`) algorithm. */
const ALGORITHM = 'HS256';
const ISSUER = 'nexus-api';
const ACCESS_AUDIENCE = 'nexus-api:access';
const REFRESH_AUDIENCE = 'nexus-api:refresh';

/**
 * Signs and verifies both token types. Access and refresh tokens use separate
 * secrets *and* audiences, so one can never be accepted as the other.
 */
@Injectable()
export class TokenService {
  private readonly accessSecret: string;
  private readonly accessTtl: number;
  private readonly refreshSecret: string;
  readonly refreshTtl: number;

  constructor(
    private readonly jwt: JwtService,
    config: ConfigService<AuthEnv, true>,
  ) {
    this.accessSecret = config.get('JWT_ACCESS_SECRET', { infer: true });
    this.accessTtl = config.get('JWT_ACCESS_EXPIRES_IN', { infer: true });
    this.refreshSecret = config.get('JWT_REFRESH_SECRET', { infer: true });
    this.refreshTtl = config.get('JWT_REFRESH_EXPIRES_IN', { infer: true });
  }

  signAccessToken(userId: string): Promise<string> {
    return this.jwt.signAsync(
      { sub: userId },
      {
        secret: this.accessSecret,
        expiresIn: this.accessTtl,
        algorithm: ALGORITHM,
        issuer: ISSUER,
        audience: ACCESS_AUDIENCE,
      },
    );
  }

  signRefreshToken(userId: string, sessionId: string): Promise<string> {
    return this.jwt.signAsync(
      { sub: userId, sid: sessionId },
      {
        secret: this.refreshSecret,
        expiresIn: this.refreshTtl,
        algorithm: ALGORITHM,
        issuer: ISSUER,
        audience: REFRESH_AUDIENCE,
      },
    );
  }

  /** @throws if the token is malformed, tampered with, or expired. */
  verifyAccessToken(token: string): Promise<AccessTokenPayload> {
    return this.jwt.verifyAsync<AccessTokenPayload>(token, {
      secret: this.accessSecret,
      algorithms: [ALGORITHM],
      issuer: ISSUER,
      audience: ACCESS_AUDIENCE,
    });
  }

  /** @throws if the token is malformed, tampered with, or expired. */
  verifyRefreshToken(token: string): Promise<RefreshTokenPayload> {
    return this.jwt.verifyAsync<RefreshTokenPayload>(token, {
      secret: this.refreshSecret,
      algorithms: [ALGORITHM],
      issuer: ISSUER,
      audience: REFRESH_AUDIENCE,
    });
  }

  /** Digest stored in place of the raw refresh token. */
  hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  /** Constant-time comparison of two hex digests. */
  digestsMatch(a: string, b: string): boolean {
    const left = Buffer.from(a, 'hex');
    const right = Buffer.from(b, 'hex');
    return left.length === right.length && timingSafeEqual(left, right);
  }
}
