import type { ProjectStatus, TaskResponse } from '@nexus/types';
import type { BadgeTone } from '@nexus/ui';

export interface TaskProgress {
  open: number;
  inProgress: number;
  completed: number;
  cancelled: number;
  /** Tasks that count toward progress (cancelled ones don't). */
  total: number;
}

/** Progress of a set of tasks, from their real statuses. */
export function taskProgress(tasks: TaskResponse[]): TaskProgress {
  const count = (status: TaskResponse['status']) =>
    tasks.filter((task) => task.status === status).length;
  const cancelled = count('CANCELLED');
  const completed = count('COMPLETED');
  return {
    open: count('TODO') + count('IN_PROGRESS'),
    inProgress: count('IN_PROGRESS'),
    completed,
    cancelled,
    total: tasks.length - cancelled,
  };
}

/** Groups tasks by project id, for per-project progress in one pass. */
export function tasksByProject(
  tasks: TaskResponse[],
): Map<string, TaskResponse[]> {
  const groups = new Map<string, TaskResponse[]>();
  for (const task of tasks) {
    if (!task.projectId) continue;
    const group = groups.get(task.projectId) ?? [];
    group.push(task);
    groups.set(task.projectId, group);
  }
  return groups;
}

export function progressLabel({ completed, total }: TaskProgress): string {
  return total === 0
    ? 'No tasks yet'
    : `${completed} of ${total} ${total === 1 ? 'task' : 'tasks'} done`;
}

export const PROJECT_STATUS_META: Record<
  ProjectStatus,
  { label: string; tone: BadgeTone }
> = {
  ACTIVE: { label: 'Active', tone: 'accent' },
  COMPLETED: { label: 'Completed', tone: 'success' },
  ARCHIVED: { label: 'Archived', tone: 'neutral' },
};
