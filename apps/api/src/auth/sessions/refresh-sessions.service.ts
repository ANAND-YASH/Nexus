import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { RefreshSession } from './refresh-session.entity';

export interface NewRefreshSession {
  id: string;
  userId: string;
  tokenHash: string;
  expiresAt: Date;
}

/** Persistence for refresh sessions. All writes are single atomic statements. */
@Injectable()
export class RefreshSessionsService {
  constructor(
    @InjectRepository(RefreshSession)
    private readonly sessions: Repository<RefreshSession>,
  ) {}

  findById(id: string): Promise<RefreshSession | null> {
    return this.sessions.findOneBy({ id });
  }

  async create(session: NewRefreshSession): Promise<void> {
    await this.sessions.insert(session);
  }

  /**
   * Revokes the session only if it is still active. Returns false when it was
   * already revoked or expired — i.e. another request won the race.
   */
  async revokeIfActive(id: string): Promise<boolean> {
    const result = await this.sessions
      .createQueryBuilder()
      .update()
      .set({ revokedAt: () => 'now()' })
      .where('id = :id', { id })
      .andWhere('revoked_at IS NULL')
      .andWhere('expires_at > now()')
      .execute();
    return (result.affected ?? 0) > 0;
  }

  /** Revokes every active session of a user (refresh-token reuse response). */
  async revokeAllForUser(userId: string): Promise<void> {
    await this.sessions.update(
      { userId, revokedAt: IsNull() },
      { revokedAt: () => 'now()' },
    );
  }
}
