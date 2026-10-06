import type {
  ContextResponse,
  CreateProjectRequest,
  ProjectResponse,
  TaskResponse,
  UpdateProjectRequest,
} from '@nexus/types';
import { notFound } from 'next/navigation';
import { cache } from 'react';
import { authedGet, authedRequest } from './authed';
import { ApiError } from './client';

/** The API only accepts UUID ids (anything else is a 400, not a 404). */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function notFoundOn404(error: unknown): never {
  // Missing and other users' projects are the same 404 on the API.
  if (error instanceof ApiError && error.status === 404) notFound();
  throw error;
}

/** One of the caller's projects, or the not-found page. */
export const getProject = cache((id: string): Promise<ProjectResponse> => {
  if (!UUID.test(id)) notFound();
  return authedGet<ProjectResponse>(`/api/projects/${id}`).catch(notFoundOn404);
});

/** Tasks assigned to a project (the tasks API filters by `projectId`). */
export const listProjectTasks = cache((projectId: string) =>
  authedGet<TaskResponse[]>(
    `/api/tasks?projectId=${encodeURIComponent(projectId)}`,
  ),
);

/**
 * The project's direct neighbours in the context graph: linked documents,
 * related entities and relationships. Document metadata only, never content.
 */
export const getProjectContext = cache((projectId: string) =>
  authedGet<ContextResponse>(`/api/context/projects/${projectId}`).catch(
    notFoundOn404,
  ),
);

export function createProject(
  body: CreateProjectRequest,
): Promise<ProjectResponse> {
  return authedRequest('/api/projects', { method: 'POST', body });
}

export function updateProject(
  id: string,
  body: UpdateProjectRequest,
): Promise<ProjectResponse> {
  return authedRequest(`/api/projects/${id}`, { method: 'PATCH', body });
}

/**
 * Permanent. The API keeps the project's tasks (they become unassigned)
 * and documents (only the links go), and drops its context relationships.
 */
export function deleteProject(id: string): Promise<void> {
  return authedRequest(`/api/projects/${id}`, { method: 'DELETE' });
}
