'use client';

import { useHydrated } from './use-clock';

function format(
  date: Date,
  {
    timeZone,
    locale,
    withTime,
  }: {
    timeZone?: string;
    locale?: string;
    withTime?: boolean;
  },
) {
  const sameYear = date.getUTCFullYear() === new Date().getUTCFullYear();
  return new Intl.DateTimeFormat(locale, {
    month: 'short',
    day: 'numeric',
    year: sameYear ? undefined : 'numeric',
    ...(withTime ? { hour: 'numeric', minute: '2-digit' } : {}),
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
  withTime = false,
}: {
  /** ISO 8601 timestamp, or a `YYYY-MM-DD` calendar date with `dateOnly`. */
  value: string;
  dateOnly?: boolean;
  /** Include the time of day (timestamps only). */
  withTime?: boolean;
}) {
  const hydrated = useHydrated();
  const date = new Date(dateOnly ? `${value}T00:00:00Z` : value);
  const time = withTime && !dateOnly;
  // Calendar dates are zone-less: always render them as written (UTC).
  const text = hydrated
    ? format(date, { timeZone: dateOnly ? 'UTC' : undefined, withTime: time })
    : format(date, { timeZone: 'UTC', locale: 'en', withTime: time });

  return <time dateTime={value}>{text}</time>;
}
