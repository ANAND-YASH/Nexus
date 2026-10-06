import type {
  CreateTaskRequest,
  TaskPriority,
  TaskResponse,
  UpdateTaskRequest,
} from '@nexus/types';
import { notFound } from 'next/navigation';
import { cache } from 'react';
import { authedGet, authedRequest } from './authed';
import { isUuid, notFoundOn404 } from './ids';
import { listTasks } from './workspace';

/** One of the caller's tasks, or the not-found page. */
export const getTask = cache((id: string): Promise<TaskResponse> => {
  if (!isUuid(id)) notFound();
  return authedGet<TaskResponse>(`/api/tasks/${id}`).catch(notFoundOn404);
});

/**
 * Tasks narrowed by the filters the API supports (one priority, one
 * project). Without filters this is the shared, per-request cached list.
 */
export const listTasksWhere = cache(
  (priority: TaskPriority | null, projectId: string | null) => {
    if (!priority && !projectId) return listTasks();
    const params = new URLSearchParams();
    if (priority) params.set('priority', priority);
    if (projectId) params.set('projectId', projectId);
    return authedGet<TaskResponse[]>(`/api/tasks?${params}`);
  },
);

export function createTask(body: CreateTaskRequest): Promise<TaskResponse> {
  return authedRequest('/api/tasks', { method: 'POST', body });
}

/** `completedAt` is never sent: the API derives it from `status`. */
export function updateTask(
  id: string,
  body: UpdateTaskRequest,
): Promise<TaskResponse> {
  return authedRequest(`/api/tasks/${id}`, { method: 'PATCH', body });
}

/** Permanent. Document links and context relationships go with it. */
export function deleteTask(id: string): Promise<void> {
  return authedRequest(`/api/tasks/${id}`, { method: 'DELETE' });
}
