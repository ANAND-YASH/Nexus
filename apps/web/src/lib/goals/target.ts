import type { GoalResponse, GoalStatus } from '@nexus/types';
import { daysBetweenKeys } from '../dates';

/*
 * A goal's `targetDate` is a calendar date (`YYYY-MM-DD`), not an instant:
 * it is never shifted between time zones. Only "today" depends on the
 * viewer, so callers pass today's day key in the viewer's zone.
 */

export type TargetState = 'past' | 'today' | 'soon' | 'later' | 'none';

/** "Coming up" covers the next two weeks: goals move slower than tasks. */
export const TARGET_SOON_DAYS = 14;

/** Only goals still being pursued can miss their target. */
export function isPursued(status: GoalStatus): boolean {
  return status === 'ACTIVE' || status === 'PAUSED';
}

export function targetState(
  goal: Pick<GoalResponse, 'targetDate' | 'status'>,
  today: string,
): TargetState {
  if (!goal.targetDate) return 'none';
  if (!isPursued(goal.status)) return 'later';
  const days = daysBetweenKeys(today, goal.targetDate);
  if (days < 0) return 'past';
  if (days === 0) return 'today';
  return days <= TARGET_SOON_DAYS ? 'soon' : 'later';
}

const STATUS_ORDER: Record<GoalStatus, number> = {
  ACTIVE: 0,
  PAUSED: 1,
  COMPLETED: 2,
  ARCHIVED: 3,
};

/** Nearest target first; goals without one follow, newest first. */
export function byTargetDate(a: GoalResponse, b: GoalResponse): number {
  if (a.targetDate && b.targetDate && a.targetDate !== b.targetDate) {
    return a.targetDate.localeCompare(b.targetDate);
  }
  if (!a.targetDate !== !b.targetDate) return a.targetDate ? -1 : 1;
  return Date.parse(b.createdAt) - Date.parse(a.createdAt);
}

/** Goals being pursued first, then by target date. */
export function byStatusThenTarget(a: GoalResponse, b: GoalResponse): number {
  return STATUS_ORDER[a.status] - STATUS_ORDER[b.status] || byTargetDate(a, b);
}

export function byNewest(a: GoalResponse, b: GoalResponse): number {
  return Date.parse(b.createdAt) - Date.parse(a.createdAt);
}

export function byRecentlyUpdated(a: GoalResponse, b: GoalResponse): number {
  return Date.parse(b.updatedAt) - Date.parse(a.updatedAt);
}

/** Active goals in target order — what the dashboard shows. */
export function activeGoals(
  goals: GoalResponse[],
  limit: number,
): GoalResponse[] {
  return goals
    .filter((goal) => goal.status === 'ACTIVE')
    .sort(byTargetDate)
    .slice(0, limit);
}
