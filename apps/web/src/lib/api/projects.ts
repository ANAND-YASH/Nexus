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
import { isUuid, notFoundOn404 } from './ids';
import { listTasksWhere } from './tasks';

/** One of the caller's projects, or the not-found page. */
export const getProject = cache((id: string): Promise<ProjectResponse> => {
  if (!isUuid(id)) notFound();
  return authedGet<ProjectResponse>(`/api/projects/${id}`).catch(notFoundOn404);
});

/** Tasks assigned to a project (the tasks API filters by `projectId`). */
export function listProjectTasks(projectId: string): Promise<TaskResponse[]> {
  return listTasksWhere(null, projectId);
}

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
