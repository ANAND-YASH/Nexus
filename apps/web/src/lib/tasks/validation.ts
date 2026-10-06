import type { TaskPriority, TaskStatus } from '@nexus/types';
import { isUuid } from '../ids';
import { TASK_PRIORITY_META, TASK_STATUS_META } from './meta';

/** Mirror the API's limits (NAME_MAX_LENGTH / DESCRIPTION_MAX_LENGTH). */
export const TASK_TITLE_MAX = 200;
export const TASK_DESCRIPTION_MAX = 10_000;

/** The API requires an explicit offset or `Z` on `dueAt`. */
const WITH_TIMEZONE = /(Z|[+-]\d{2}:\d{2})$/i;

export interface TaskInput {
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  /** ISO 8601 with offset, or null for no due date. */
  dueAt: string | null;
  /** null = not part of a project. */
  projectId: string | null;
}

export type TaskFieldErrors = Partial<
  Record<
    'title' | 'description' | 'status' | 'priority' | 'dueDate' | 'projectId',
    string
  >
>;

export interface RawTaskForm {
  title: string;
  description: string;
  status: string;
  priority: string;
  /** Computed in the browser from the local date/time inputs. */
  dueAt: string;
  /** The raw date input, so "invalid date" can be told apart from "none". */
  dueDate: string;
  dueTime: string;
  projectId: string;
}

/** Shared by the form (instant feedback) and the action (authoritative). */
export function validateTask(
  raw: RawTaskForm,
): { input: TaskInput; errors?: undefined } | { errors: TaskFieldErrors } {
  const title = raw.title.trim();
  const description = raw.description.trim();
  const errors: TaskFieldErrors = {};

  if (!title) errors.title = 'Give the task a title.';
  else if (title.length > TASK_TITLE_MAX) {
    errors.title = `Keep the title under ${TASK_TITLE_MAX} characters.`;
  }
  if (description.length > TASK_DESCRIPTION_MAX) {
    errors.description = `Keep the description under ${TASK_DESCRIPTION_MAX.toLocaleString('en')} characters.`;
  }
  if (!(raw.status in TASK_STATUS_META)) errors.status = 'Choose a status.';
  if (!(raw.priority in TASK_PRIORITY_META)) {
    errors.priority = 'Choose a priority.';
  }
  const dueAt = raw.dueAt.trim();
  if (raw.dueTime && !raw.dueDate) errors.dueDate = 'Add a date for this time.';
  else if (raw.dueDate && !dueAt) errors.dueDate = 'Enter a valid date.';
  if (
    dueAt &&
    (!WITH_TIMEZONE.test(dueAt) || Number.isNaN(Date.parse(dueAt)))
  ) {
    errors.dueDate = 'Enter a valid date.';
  }
  const projectId = raw.projectId.trim();
  if (projectId && !isUuid(projectId)) errors.projectId = 'Choose a project.';

  if (Object.keys(errors).length > 0) return { errors };
  return {
    input: {
      title,
      description: description || null,
      status: raw.status as TaskStatus,
      priority: raw.priority as TaskPriority,
      dueAt: dueAt || null,
      projectId: projectId || null,
    },
  };
}

export function readTaskForm(formData: FormData): RawTaskForm {
  const field = (name: string) => String(formData.get(name) ?? '');
  return {
    title: field('title'),
    description: field('description'),
    status: field('status'),
    priority: field('priority'),
    dueAt: field('dueAt'),
    dueDate: field('dueDate'),
    dueTime: field('dueTime'),
    projectId: field('projectId'),
  };
}
