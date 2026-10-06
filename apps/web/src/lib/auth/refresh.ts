import type { TokenPair } from '@nexus/types';
import { refresh } from '../api/auth';
import { ApiError } from '../api/client';

export type RefreshResult =
  | { kind: 'refreshed'; tokens: TokenPair }
  /** The session is over (expired, revoked or rotated). */
  | { kind: 'invalid' }
  /** The API could not answer; keep the session and let the page decide. */
  | { kind: 'unavailable' };

/**
 * Refresh tokens are single-use and presenting a rotated one revokes every
 * session of the user. Parallel requests (prefetches, multiple tabs) carrying
 * the same expired cookie must therefore share ONE refresh call. Results are
 * kept briefly so requests that arrive just after the rotation reuse it too.
 *
 * Process-local: with several web instances, route a session to one instance
 * or move this to a shared store.
 */
const REUSE_WINDOW_MS = 15_000;
const pending = new Map<string, Promise<RefreshResult>>();

async function exchange(refreshToken: string): Promise<RefreshResult> {
  try {
    return { kind: 'refreshed', tokens: await refresh(refreshToken) };
  } catch (error) {
    if (
      error instanceof ApiError &&
      (error.status === 401 || error.status === 400)
    ) {
      return { kind: 'invalid' };
    }
    return { kind: 'unavailable' };
  }
}

export function refreshSession(refreshToken: string): Promise<RefreshResult> {
  let result = pending.get(refreshToken);
  if (!result) {
    result = exchange(refreshToken);
    pending.set(refreshToken, result);
    void result.finally(() => {
      setTimeout(() => pending.delete(refreshToken), REUSE_WINDOW_MS).unref?.();
    });
  }
  return result;
}
