/*
 * Due-date semantics for display. The API stores `dueAt` as an absolute
 * timestamp; "today" and "soon" depend on the viewer's calendar, so these
 * helpers take the time zone explicitly (undefined = the runtime's own).
 */

export type DueState = 'overdue' | 'today' | 'soon' | 'later' | 'none';

/** "Due soon" covers tomorrow through this many days ahead. */
export const DUE_SOON_DAYS = 3;

const DAY_MS = 86_400_000;

/** `YYYY-MM-DD` of an instant in a time zone. */
function dayKey(ms: number, timeZone?: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(ms);
}

/** Whole calendar days from `now` to `target` in a time zone. */
export function calendarDaysBetween(
  now: number,
  target: number,
  timeZone?: string,
): number {
  return Math.round(
    (Date.parse(dayKey(target, timeZone)) - Date.parse(dayKey(now, timeZone))) /
      DAY_MS,
  );
}

/** Urgency of an open task's due date. Closed tasks are never urgent. */
export function dueState(
  dueAt: string | null,
  open: boolean,
  now: number,
  timeZone?: string,
): DueState {
  if (!dueAt) return 'none';
  if (!open) return 'later';
  const due = Date.parse(dueAt);
  if (due < now) return 'overdue';
  const days = calendarDaysBetween(now, due, timeZone);
  if (days <= 0) return 'today';
  return days <= DUE_SOON_DAYS ? 'soon' : 'later';
}

/*
 * The form edits a local date plus an optional time. With no time, the task
 * is due at the end of that day (23:59 local), so it only becomes overdue
 * once the day is over. Browser-only: they use the viewer's time zone.
 */

const END_OF_DAY = '23:59';

/** Local `YYYY-MM-DD` + optional `HH:mm` → ISO 8601 with offset (UTC). */
export function toDueAt(date: string, time: string): string | null {
  if (!date) return null;
  const local = new Date(`${date}T${time || END_OF_DAY}`);
  return Number.isNaN(local.getTime()) ? null : local.toISOString();
}

const pad = (n: number) => String(n).padStart(2, '0');

/** ISO timestamp → the local date and time inputs ("" time = end of day). */
export function fromDueAt(dueAt: string | null): {
  date: string;
  time: string;
} {
  if (!dueAt) return { date: '', time: '' };
  const d = new Date(dueAt);
  const time = `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  return {
    date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
    time: time === END_OF_DAY ? '' : time,
  };
}

/** True when a due time is the "end of day" default (no explicit time). */
export function isEndOfDay(dueAt: string, timeZone?: string): boolean {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(Date.parse(dueAt));
  return parts === END_OF_DAY;
}
