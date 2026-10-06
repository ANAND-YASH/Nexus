import { unstable_rethrow } from 'next/navigation';
import { ApiError } from '../api/client';

/**
 * Turns a failed API call inside a Server Action into a message for people.
 * Next.js control flow (redirects, e.g. to sign-in) passes straight through.
 */
export function describeFailure(
  error: unknown,
  notFoundMessage: string,
): string {
  unstable_rethrow(error);
  if (!(error instanceof ApiError) || error.unreachable) {
    return "We couldn't reach NEXUS. Check your connection and try again.";
  }
  if (error.status === 404) return notFoundMessage;
  // Validation messages from the API are written for people.
  if (error.status === 400) return error.message;
  return 'Something went wrong on our side. Please try again.';
}
