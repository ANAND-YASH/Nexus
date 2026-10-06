'use client';

import { Badge, cn } from '@nexus/ui';
import { ClockIcon } from '@/components/icons';
import { useHydrated, useMinuteClock } from '@/components/use-clock';
import {
  calendarDaysBetween,
  dueState,
  isEndOfDay,
  type DueState,
} from '@/lib/tasks/due';

function formatDue(
  dueAt: string,
  state: DueState,
  now: number,
  timeZone: string | undefined,
  locale: string | undefined,
): string {
  const due = Date.parse(dueAt);
  const time = isEndOfDay(dueAt, timeZone)
    ? ''
    : new Intl.DateTimeFormat(locale, {
        hour: 'numeric',
        minute: '2-digit',
        timeZone,
      }).format(due);
  const days = calendarDaysBetween(now, due, timeZone);
  const sameYear = Math.abs(days) < 300;
  const date = new Intl.DateTimeFormat(locale, {
    month: 'short',
    day: 'numeric',
    year: sameYear ? undefined : 'numeric',
    timeZone,
  }).format(due);

  if (state === 'today') return time ? `Due today, ${time}` : 'Due today';
  if (state === 'soon') {
    const day =
      days === 1
        ? 'tomorrow'
        : new Intl.DateTimeFormat(locale, {
            weekday: 'short',
            timeZone,
          }).format(due);
    return `Due ${day}${time ? `, ${time}` : ''}`;
  }
  if (state === 'overdue') {
    if (days === 0) return time ? `Overdue, ${time}` : 'Overdue';
    return `Overdue · ${date}`;
  }
  return date;
}

/**
 * A task's due date with its urgency, in the viewer's time zone. Urgency is
 * always spelled out in text, never shown by color alone.
 */
export function DueLabel({
  dueAt,
  open,
  showEmpty = false,
}: {
  dueAt: string | null;
  /** Closed tasks show the date without urgency. */
  open: boolean;
  showEmpty?: boolean;
}) {
  const hydrated = useHydrated();
  const now = useMinuteClock();
  const timeZone = hydrated ? undefined : 'UTC';
  const locale = hydrated ? undefined : 'en';

  if (!dueAt) {
    return showEmpty ? (
      <span className="text-xs text-fg-subtle">No due date</span>
    ) : null;
  }

  const state = dueState(dueAt, open, now, timeZone);
  const text = formatDue(dueAt, state, now, timeZone, locale);
  const label = <time dateTime={dueAt}>{text}</time>;

  if (state === 'overdue') {
    return (
      <Badge tone="danger" dot>
        {label}
      </Badge>
    );
  }
  if (state === 'today') {
    return (
      <Badge tone="warning" dot>
        {label}
      </Badge>
    );
  }
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 text-xs whitespace-nowrap tabular-nums',
        state === 'soon' ? 'font-medium text-fg' : 'text-fg-muted',
      )}
    >
      <ClockIcon width={13} height={13} className="shrink-0 text-fg-subtle" />
      {state === 'later' && open && <span className="sr-only">Due </span>}
      {!open && <span className="sr-only">Was due </span>}
      {label}
    </span>
  );
}
