import type { UserResponse } from '@nexus/types';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { cache } from 'react';
import { me } from '../api/auth';
import { ApiError } from '../api/client';
import { ACCESS_COOKIE } from './tokens';

/**
 * Data-access-layer entry point: the current access token, or a redirect to
 * sign-in. Refreshing happens earlier, in `proxy.ts`, because Server
 * Components cannot set cookies.
 */
export const getAccessToken = cache(async (): Promise<string> => {
  const token = (await cookies()).get(ACCESS_COOKIE)?.value;
  if (!token) redirect('/sign-in');
  return token;
});

/** Sends the user to sign-in when the API rejects their token. */
export function handleAuthError(error: unknown): never {
  if (error instanceof ApiError && error.status === 401) redirect('/sign-in');
  throw error;
}

export const getCurrentUser = cache(async (): Promise<UserResponse> => {
  const token = await getAccessToken();
  return me(token).catch(handleAuthError);
});
