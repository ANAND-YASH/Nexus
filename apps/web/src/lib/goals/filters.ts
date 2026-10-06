import type { GoalResponse, GoalStatus } from '@nexus/types';
import {
  byNewest,
  byRecentlyUpdated,
  byStatusThenTarget,
  byTargetDate,
} from './target';

export type GoalStatusFilter =
  'all' | 'active' | 'paused' | 'completed' | 'archived';
export type GoalSort = 'target' | 'newest' | 'updated';

export interface GoalFilters {
  status: GoalStatusFilter;
  sort: GoalSort;
}

export const GOAL_STATUS_FILTERS: ReadonlyArray<{
  value: GoalStatusFilter;
  label: string;
  status?: GoalStatus;
}> = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active', status: 'ACTIVE' },
  { value: 'paused', label: 'Paused', status: 'PAUSED' },
  { value: 'completed', label: 'Achieved', status: 'COMPLETED' },
  { value: 'archived', label: 'Archived', status: 'ARCHIVED' },
];

export const GOAL_SORTS: ReadonlyArray<{ value: GoalSort; label: string }> = [
  { value: 'target', label: 'Target date' },
  { value: 'newest', label: 'Newest' },
  { value: 'updated', label: 'Recently updated' },
];

export const DEFAULT_GOAL_FILTERS: GoalFilters = {
  status: 'all',
  sort: 'target',
};

type Params = Record<string, string | string[] | undefined>;
const first = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value;

export function parseGoalFilters(params: Params): GoalFilters {
  const status = first(params.status);
  const sort = first(params.sort);
  return {
    status: GOAL_STATUS_FILTERS.some((f) => f.value === status)
      ? (status as GoalStatusFilter)
      : DEFAULT_GOAL_FILTERS.status,
    sort: GOAL_SORTS.some((s) => s.value === sort)
      ? (sort as GoalSort)
      : DEFAULT_GOAL_FILTERS.sort,
  };
}

/** Query string for a set of filters; defaults are left out. */
export function goalFiltersHref(filters: GoalFilters): string {
  const params = new URLSearchParams();
  if (filters.status !== DEFAULT_GOAL_FILTERS.status) {
    params.set('status', filters.status);
  }
  if (filters.sort !== DEFAULT_GOAL_FILTERS.sort)
    params.set('sort', filters.sort);
  const query = params.toString();
  return query ? `/goals?${query}` : '/goals';
}

export function countByStatus(goals: GoalResponse[], filter: GoalStatusFilter) {
  const status = GOAL_STATUS_FILTERS.find((f) => f.value === filter)?.status;
  return status
    ? goals.filter((g) => g.status === status).length
    : goals.length;
}

export function applyGoalFilters(
  goals: GoalResponse[],
  filters: GoalFilters,
): GoalResponse[] {
  const status = GOAL_STATUS_FILTERS.find(
    (f) => f.value === filters.status,
  )?.status;
  const compare =
    filters.sort === 'newest'
      ? byNewest
      : filters.sort === 'updated'
        ? byRecentlyUpdated
        : // "All" groups by status so pursued goals come first.
          status
          ? byTargetDate
          : byStatusThenTarget;
  return goals.filter((g) => !status || g.status === status).sort(compare);
}
