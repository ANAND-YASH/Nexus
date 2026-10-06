'use server';

import type { TaskPriority, TaskStatus } from '@nexus/types';
import { refresh } from 'next/cache';
import { redirect } from 'next/navigation';
import { describeFailure } from '../actions/failure';
import { savedState, type FormActionState } from '../forms';
import { ApiError } from '../api/client';
import { createTask, deleteTask, updateTask } from '../api/tasks';
import { TASK_PRIORITY_META, TASK_STATUS_META } from './meta';
import { readTaskForm, validateTask, type TaskFieldErrors } from './validation';

export type TaskFormState = FormActionState<keyof TaskFieldErrors>;

export interface TaskActionResult {
  error?: string;
}

const TASK_GONE = 'This task no longer exists. It may have been deleted.';

/** A 404 on save can mean the task or the chosen project is gone. */
function saveFailure(
  error: unknown,
): Pick<TaskFormState, 'error' | 'fieldErrors'> {
  if (
    error instanceof ApiError &&
    error.status === 404 &&
    /project/i.test(error.message)
  ) {
    return {
      fieldErrors: {
        projectId: 'That project no longer exists. Choose another one.',
      },
    };
  }
  return { error: describeFailure(error, TASK_GONE) };
}

export async function createTaskAction(
  state: TaskFormState,
  formData: FormData,
): Promise<TaskFormState> {
  const result = validateTask(readTaskForm(formData));
  if (result.errors)
    return { ...state, error: undefined, fieldErrors: result.errors };

  try {
    const task = await createTask(result.input);
    refresh();
    return savedState(state, task.id);
  } catch (error) {
    return {
      ...state,
      error: undefined,
      fieldErrors: undefined,
      ...saveFailure(error),
    };
  }
}

export async function updateTaskAction(
  id: string,
  state: TaskFormState,
  formData: FormData,
): Promise<TaskFormState> {
  const result = validateTask(readTaskForm(formData));
  if (result.errors)
    return { ...state, error: undefined, fieldErrors: result.errors };

  try {
    await updateTask(id, result.input);
    refresh();
    return savedState(state, id);
  } catch (error) {
    return {
      ...state,
      error: undefined,
      fieldErrors: undefined,
      ...saveFailure(error),
    };
  }
}

/** One-field updates (complete, reopen, change priority) without the editor. */
export async function patchTaskAction(
  id: string,
  patch: { status?: TaskStatus; priority?: TaskPriority },
): Promise<TaskActionResult> {
  // Server Action arguments come from the client: accept only these fields.
  const body = {
    ...(patch.status && patch.status in TASK_STATUS_META
      ? { status: patch.status }
      : {}),
    ...(patch.priority && patch.priority in TASK_PRIORITY_META
      ? { priority: patch.priority }
      : {}),
  };
  if (Object.keys(body).length === 0) return { error: 'Nothing to update.' };

  try {
    await updateTask(id, body);
  } catch (error) {
    return { error: describeFailure(error, TASK_GONE) };
  }
  refresh();
  return {};
}

export async function deleteTaskAction(id: string): Promise<TaskActionResult> {
  try {
    await deleteTask(id);
  } catch (error) {
    return { error: describeFailure(error, TASK_GONE) };
  }
  redirect('/tasks');
}
