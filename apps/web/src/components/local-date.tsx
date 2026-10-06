'use client';

import { useSyncExternalStore } from 'react';

const noopSubscribe = () => () => {};

function format(date: Date, timeZone: string | undefined, locale?: string) {
  const sameYear = date.getUTCFullYear() === new Date().getUTCFullYear();
  return new Intl.DateTimeFormat(locale, {
    month: 'short',
    day: 'numeric',
    year: sameYear ? undefined : 'numeric',
    timeZone,
  }).format(date);
}

/**
 * Formats a date in the viewer's own locale and time zone. The server can't
 * know those, so it renders a UTC value that is swapped after hydration.
 */
export function LocalDate({
  value,
  dateOnly = false,
}: {
  /** ISO 8601 timestamp, or a `YYYY-MM-DD` calendar date with `dateOnly`. */
  value: string;
  dateOnly?: boolean;
}) {
  const hydrated = useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
  const date = new Date(dateOnly ? `${value}T00:00:00Z` : value);
  // Calendar dates are zone-less: always render them as written (UTC).
  const text = hydrated
    ? format(date, dateOnly ? 'UTC' : undefined)
    : format(date, 'UTC', 'en');

  return <time dateTime={value}>{text}</time>;
}
