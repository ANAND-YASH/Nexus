import type { TaskPriority, TaskStatus } from '@nexus/types';
import type { BadgeTone } from '@nexus/ui';

/** UI labels for the API's enums; the enum values themselves never change. */
export const TASK_STATUS_META: Record<
  TaskStatus,
  { label: string; tone: BadgeTone }
> = {
  TODO: { label: 'To do', tone: 'neutral' },
  IN_PROGRESS: { label: 'In progress', tone: 'accent' },
  COMPLETED: { label: 'Completed', tone: 'success' },
  CANCELLED: { label: 'Cancelled', tone: 'neutral' },
};

export const TASK_PRIORITY_META: Record<
  TaskPriority,
  { label: string; level: 1 | 2 | 3 | 4 }
> = {
  LOW: { label: 'Low', level: 1 },
  MEDIUM: { label: 'Medium', level: 2 },
  HIGH: { label: 'High', level: 3 },
  URGENT: { label: 'Urgent', level: 4 },
};

export const TASK_STATUS_OPTIONS = (
  Object.keys(TASK_STATUS_META) as TaskStatus[]
).map((value) => ({ value, label: TASK_STATUS_META[value].label }));

export const TASK_PRIORITY_OPTIONS = (
  Object.keys(TASK_PRIORITY_META) as TaskPriority[]
).map((value) => ({ value, label: TASK_PRIORITY_META[value].label }));
