import { randomUUID } from 'node:crypto';
import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import type { AuthResponse, TokenPair, UserResponse } from '@nexus/types';
import { toUserResponse } from '../users/user.mapper';
import { UsersService } from '../users/users.service';
import type { RefreshTokenPayload } from './auth.types';
import type { LoginDto, RegisterDto } from './dto/credentials.dto';
import { PasswordService } from './password.service';
import { RefreshSessionsService } from './sessions/refresh-sessions.service';
import { TokenService } from './token.service';

const INVALID_CREDENTIALS = 'Invalid email or password.';
const INVALID_REFRESH_TOKEN = 'Invalid refresh token.';

@Injectable()
export class AuthService {
  // Logs carry ids only — never passwords, hashes or tokens.
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly users: UsersService,
    private readonly passwords: PasswordService,
    private readonly tokens: TokenService,
    private readonly sessions: RefreshSessionsService,
  ) {}

  /** @throws ConflictException (409) if the email is taken. */
  async register(dto: RegisterDto): Promise<AuthResponse> {
    const passwordHash = await this.passwords.hash(dto.password);
    const user = await this.users.create(dto.email, passwordHash);
    this.logger.log(`User registered: ${user.id}`);
    return { user: toUserResponse(user), ...(await this.issueTokens(user.id)) };
  }

  /** @throws UnauthorizedException (401) with one generic message. */
  async login(dto: LoginDto): Promise<AuthResponse> {
    const user = await this.users.findByEmailWithPassword(dto.email);
    const valid = user
      ? await this.passwords.verify(user.passwordHash, dto.password)
      : await this.passwords.verifyDummy(dto.password);

    if (!user || !valid) {
      throw new UnauthorizedException(INVALID_CREDENTIALS);
    }
    return { user: toUserResponse(user), ...(await this.issueTokens(user.id)) };
  }

  /**
   * Single-use rotation: the presented token's session is revoked and a new
   * session + token pair is issued. Presenting any revoked token (rotated or
   * logged out) means it leaked, so every session of that user is revoked.
   */
  async refresh(refreshToken: string): Promise<TokenPair> {
    const payload = await this.verifyRefreshToken(refreshToken);
    const session = await this.sessions.findById(payload.sid);

    if (
      !session ||
      session.userId !== payload.sub ||
      !this.tokens.digestsMatch(
        session.tokenHash,
        this.tokens.hashToken(refreshToken),
      )
    ) {
      throw new UnauthorizedException(INVALID_REFRESH_TOKEN);
    }

    if (session.revokedAt) {
      await this.sessions.revokeAllForUser(session.userId);
      this.logger.warn(
        `Revoked refresh token presented; revoked all sessions for user ${session.userId}`,
      );
      throw new UnauthorizedException(INVALID_REFRESH_TOKEN);
    }

    // Atomic: only one concurrent request can revoke (and thus rotate) it.
    if (!(await this.sessions.revokeIfActive(session.id))) {
      throw new UnauthorizedException(INVALID_REFRESH_TOKEN);
    }
    return this.issueTokens(session.userId);
  }

  /**
   * Revokes the session behind the refresh token. Idempotent: logging out an
   * already-revoked session succeeds silently.
   */
  async logout(refreshToken: string): Promise<void> {
    const payload = await this.verifyRefreshToken(refreshToken);
    const session = await this.sessions.findById(payload.sid);
    if (
      !session ||
      !this.tokens.digestsMatch(
        session.tokenHash,
        this.tokens.hashToken(refreshToken),
      )
    ) {
      throw new UnauthorizedException(INVALID_REFRESH_TOKEN);
    }
    await this.sessions.revokeIfActive(session.id);
  }

  /** @throws UnauthorizedException if the user no longer exists. */
  async me(userId: string): Promise<UserResponse> {
    const user = await this.users.findById(userId);
    if (!user) throw new UnauthorizedException();
    return toUserResponse(user);
  }

  private async issueTokens(userId: string): Promise<TokenPair> {
    const sessionId = randomUUID();
    const refreshToken = await this.tokens.signRefreshToken(userId, sessionId);
    await this.sessions.create({
      id: sessionId,
      userId,
      tokenHash: this.tokens.hashToken(refreshToken),
      expiresAt: new Date(Date.now() + this.tokens.refreshTtl * 1000),
    });
    return {
      accessToken: await this.tokens.signAccessToken(userId),
      refreshToken,
    };
  }

  private async verifyRefreshToken(
    token: string,
  ): Promise<RefreshTokenPayload> {
    try {
      return await this.tokens.verifyRefreshToken(token);
    } catch {
      // Malformed, tampered and expired all look the same to the client.
      throw new UnauthorizedException(INVALID_REFRESH_TOKEN);
    }
  }
}
