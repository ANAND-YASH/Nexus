/*
 * Calendar-day helpers. A "day key" is `YYYY-MM-DD` — the same format as
 * the API's calendar dates (e.g. a goal's `targetDate`), so keys compare
 * as plain strings. `timeZone` undefined = the runtime's own zone.
 */

const DAY_MS = 86_400_000;

/** `YYYY-MM-DD` of an instant in a time zone. */
export function dayKey(ms: number, timeZone?: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(ms);
}

/** Whole days from one day key to another (negative = in the past). */
export function daysBetweenKeys(from: string, to: string): number {
  return Math.round((Date.parse(to) - Date.parse(from)) / DAY_MS);
}

/** True for a real calendar date in `YYYY-MM-DD` form (rejects 2026-02-30). */
export function isDateKey(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(value);
}
