import { getAccessToken, handleAuthError } from '../auth/session';
import { apiRequest, type ApiRequestOptions } from './client';

/** Calls the API as the signed-in user. Redirects to sign-in if the session is gone. */
export async function authedRequest<T>(
  path: string,
  options: Omit<ApiRequestOptions, 'token'> = {},
): Promise<T> {
  const token = await getAccessToken();
  return apiRequest<T>(path, { ...options, token }).catch(handleAuthError);
}

/** GET as the signed-in user. */
export function authedGet<T>(path: string): Promise<T> {
  return authedRequest<T>(path);
}
