import { notFound } from 'next/navigation';
import { ApiError } from './client';

export { isUuid } from '../ids';

/**
 * Shows the not-found page for a 404. Missing records and other users'
 * records are the same 404 on the API, so nothing leaks either way.
 */
export function notFoundOn404(error: unknown): never {
  if (error instanceof ApiError && error.status === 404) notFound();
  throw error;
}
