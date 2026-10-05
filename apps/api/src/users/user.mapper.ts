import type { UserResponse } from '@nexus/types';
import type { User } from './user.entity';

/** Maps the entity to its public shape; credentials are never copied. */
export function toUserResponse(user: User): UserResponse {
  return {
    id: user.id,
    email: user.email,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  };
}
