import type { ProjectResponse } from '@nexus/types';
import type { Project } from './project.entity';

/** Public shape: no owner or relation data. */
export function toProjectResponse(project: Project): ProjectResponse {
  return {
    id: project.id,
    name: project.name,
    description: project.description,
    status: project.status,
    createdAt: project.createdAt.toISOString(),
    updatedAt: project.updatedAt.toISOString(),
  };
}
