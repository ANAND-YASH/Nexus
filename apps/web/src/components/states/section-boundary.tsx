'use client';

import { catchError, type ErrorInfo } from 'next/error';
import { RouteError } from './route-error';

/**
 * Error boundary for one part of a page, so a single failing section
 * doesn't take the rest of the page down. Redirects (e.g. to sign-in)
 * pass straight through.
 */
export const SectionBoundary = catchError(function SectionError(
  { subject, size = 'compact' }: { subject: string; size?: 'compact' | 'page' },
  { retry }: ErrorInfo,
) {
  return <RouteError retry={retry} subject={subject} size={size} />;
});
