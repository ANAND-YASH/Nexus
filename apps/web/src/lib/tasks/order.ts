import type { TaskPriority, TaskResponse } from '@nexus/types';

/*
 * The one place task ordering and urgency are defined. The dashboard,
 * project pages and the Tasks list all use these.
 */

export function isOpenTask(task: TaskResponse): boolean {
  return task.status === 'TODO' || task.status === 'IN_PROGRESS';
}

/** Timestamp comparison, so it's the same in every time zone. */
export function isOverdue(task: TaskResponse, now = Date.now()): boolean {
  return (
    isOpenTask(task) && task.dueAt !== null && Date.parse(task.dueAt) < now
  );
}

export const PRIORITY_RANK: Record<TaskPriority, number> = {
  URGENT: 0,
  HIGH: 1,
  MEDIUM: 2,
  LOW: 3,
};

const newestFirst = (a: TaskResponse, b: TaskResponse) =>
  Date.parse(b.createdAt) - Date.parse(a.createdAt);

/** Soonest due first; undated tasks follow, by priority then newest. */
export function byDueDate(a: TaskResponse, b: TaskResponse): number {
  if (a.dueAt && b.dueAt) return Date.parse(a.dueAt) - Date.parse(b.dueAt);
  if (a.dueAt || b.dueAt) return a.dueAt ? -1 : 1;
  return (
    PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority] || newestFirst(a, b)
  );
}

/** Most urgent first; ties broken by due date. */
export function byPriority(a: TaskResponse, b: TaskResponse): number {
  return (
    PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority] || byDueDate(a, b)
  );
}

export function byNewest(a: TaskResponse, b: TaskResponse): number {
  return newestFirst(a, b);
}

export function byRecentlyUpdated(a: TaskResponse, b: TaskResponse): number {
  return Date.parse(b.updatedAt) - Date.parse(a.updatedAt);
}

export interface TaskView {
  task: TaskResponse;
  overdue: boolean;
}

/** Open tasks in the order to work on them. */
export function upNext(tasks: TaskResponse[], limit: number): TaskView[] {
  const now = Date.now();
  return tasks
    .filter(isOpenTask)
    .sort(byDueDate)
    .slice(0, limit)
    .map((task) => ({ task, overdue: isOverdue(task, now) }));
}
