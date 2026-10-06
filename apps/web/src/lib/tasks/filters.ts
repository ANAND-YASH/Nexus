import type { TaskPriority, TaskResponse, TaskStatus } from '@nexus/types';
import { isUuid } from '../ids';
import { TASK_PRIORITY_META } from './meta';
import {
  byDueDate,
  byNewest,
  byPriority,
  byRecentlyUpdated,
  isOpenTask,
} from './order';

/** URL search params of `/tasks`, validated. Lowercase in the URL. */
export interface TaskFilters {
  status: StatusFilter;
  priority: TaskPriority | null;
  /** A project id, `none` (no project) or null (any). */
  project: string | 'none' | null;
  sort: TaskSort;
}

export type StatusFilter =
  'open' | 'todo' | 'in_progress' | 'completed' | 'cancelled' | 'all';
export type TaskSort = 'due' | 'priority' | 'newest' | 'updated';

export const STATUS_FILTERS: ReadonlyArray<{
  value: StatusFilter;
  label: string;
  matches: (task: TaskResponse) => boolean;
}> = [
  { value: 'open', label: 'Open', matches: isOpenTask },
  { value: 'todo', label: 'To do', matches: (t) => t.status === 'TODO' },
  {
    value: 'in_progress',
    label: 'In progress',
    matches: (t) => t.status === 'IN_PROGRESS',
  },
  {
    value: 'completed',
    label: 'Completed',
    matches: (t) => t.status === 'COMPLETED',
  },
  {
    value: 'cancelled',
    label: 'Cancelled',
    matches: (t) => t.status === 'CANCELLED',
  },
  { value: 'all', label: 'All', matches: () => true },
];

export const TASK_SORTS: ReadonlyArray<{
  value: TaskSort;
  label: string;
  compare: (a: TaskResponse, b: TaskResponse) => number;
}> = [
  { value: 'due', label: 'Due date', compare: byDueDate },
  { value: 'priority', label: 'Priority', compare: byPriority },
  { value: 'newest', label: 'Newest', compare: byNewest },
  { value: 'updated', label: 'Recently updated', compare: byRecentlyUpdated },
];

export const DEFAULT_TASK_FILTERS: TaskFilters = {
  status: 'open',
  priority: null,
  project: null,
  sort: 'due',
};

type Params = Record<string, string | string[] | undefined>;

const first = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value;

export function parseTaskFilters(params: Params): TaskFilters {
  const status = first(params.status);
  const priority = first(params.priority)?.toUpperCase();
  const project = first(params.project);
  const sort = first(params.sort);
  return {
    status: STATUS_FILTERS.some((f) => f.value === status)
      ? (status as StatusFilter)
      : DEFAULT_TASK_FILTERS.status,
    priority:
      priority && priority in TASK_PRIORITY_META
        ? (priority as TaskPriority)
        : null,
    project: project === 'none' || isUuid(project) ? project : null,
    sort: TASK_SORTS.some((s) => s.value === sort)
      ? (sort as TaskSort)
      : DEFAULT_TASK_FILTERS.sort,
  };
}

/** Query string for a set of filters; defaults are left out. */
export function taskFiltersHref(filters: TaskFilters): string {
  const params = new URLSearchParams();
  if (filters.status !== DEFAULT_TASK_FILTERS.status) {
    params.set('status', filters.status);
  }
  if (filters.priority) params.set('priority', filters.priority.toLowerCase());
  if (filters.project) params.set('project', filters.project);
  if (filters.sort !== DEFAULT_TASK_FILTERS.sort)
    params.set('sort', filters.sort);
  const query = params.toString();
  return query ? `/tasks?${query}` : '/tasks';
}

export function hasNarrowingFilters(filters: TaskFilters): boolean {
  return filters.priority !== null || filters.project !== null;
}

/**
 * Applies what the API couldn't: the status groups ("open" spans two
 * statuses) and "no project", then sorts.
 */
export function applyTaskFilters(
  tasks: TaskResponse[],
  filters: TaskFilters,
): TaskResponse[] {
  const status = STATUS_FILTERS.find((f) => f.value === filters.status)!;
  const sort = TASK_SORTS.find((s) => s.value === filters.sort)!;
  return tasks
    .filter(status.matches)
    .filter((task) => filters.project !== 'none' || task.projectId === null)
    .sort(sort.compare);
}

export function statusFilterFor(status: TaskStatus): StatusFilter {
  return status.toLowerCase() as StatusFilter;
}
