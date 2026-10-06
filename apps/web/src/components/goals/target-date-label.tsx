'use client';

import type { GoalStatus } from '@nexus/types';
import { Badge, cn } from '@nexus/ui';
import { FlagIcon } from '@/components/icons';
import { useHydrated, useMinuteClock } from '@/components/use-clock';
import { dayKey, daysBetweenKeys } from '@/lib/dates';
import { targetState } from '@/lib/goals/target';

function formatTarget(
  targetDate: string,
  today: string,
  locale: string | undefined,
  long: boolean,
) {
  // A calendar date: format it as written (UTC), never shifted by zone.
  const date = new Date(`${targetDate}T00:00:00Z`);
  return new Intl.DateTimeFormat(locale, {
    weekday: long ? 'long' : undefined,
    month: long ? 'long' : 'short',
    day: 'numeric',
    year:
      long || targetDate.slice(0, 4) !== today.slice(0, 4)
        ? 'numeric'
        : undefined,
    timeZone: 'UTC',
  }).format(date);
}

/**
 * A goal's target date and how close it is, measured against the viewer's
 * own "today". Closeness is always written out, never color alone.
 */
export function TargetDateLabel({
  targetDate,
  status,
  long = false,
  showEmpty = false,
  className,
}: {
  targetDate: string | null;
  status: GoalStatus;
  /** Full weekday + month (detail pages). */
  long?: boolean;
  showEmpty?: boolean;
  className?: string;
}) {
  const hydrated = useHydrated();
  const now = useMinuteClock();
  const today = dayKey(now, hydrated ? undefined : 'UTC');
  const locale = hydrated ? undefined : 'en';

  if (!targetDate) {
    return showEmpty ? (
      <span className={cn('text-xs text-fg-subtle', className)}>
        No target date
      </span>
    ) : null;
  }

  const state = targetState({ targetDate, status }, today);
  const date = formatTarget(targetDate, today, locale, long);
  const days = daysBetweenKeys(today, targetDate);
  const time = <time dateTime={targetDate}>{date}</time>;

  if (state === 'past') {
    const ago = -days;
    return (
      <Badge tone="warning" dot className={className}>
        Target passed {ago === 1 ? 'yesterday' : `${ago} days ago`} · {time}
      </Badge>
    );
  }
  if (state === 'today') {
    return (
      <Badge tone="accent" dot className={className}>
        Target is today · {time}
      </Badge>
    );
  }
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 text-xs whitespace-nowrap',
        state === 'soon' ? 'font-medium text-fg' : 'text-fg-muted',
        className,
      )}
    >
      <FlagIcon width={13} height={13} className="shrink-0 text-fg-subtle" />
      <span>
        Target {time}
        {state === 'soon' && (
          <span className="text-fg-muted">
            {' '}
            · {days === 1 ? 'tomorrow' : `in ${days} days`}
          </span>
        )}
      </span>
    </span>
  );
}
