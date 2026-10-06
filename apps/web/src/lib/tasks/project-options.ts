import type { ProjectResponse } from '@nexus/types';

export interface ProjectOption {
  id: string;
  name: string;
  status: ProjectResponse['status'];
}

/**
 * Only what the project pickers need is sent to the browser. Active and
 * completed projects first (alphabetical), archived last.
 */
export function toProjectOptions(projects: ProjectResponse[]): ProjectOption[] {
  return projects
    .map(({ id, name, status }) => ({ id, name, status }))
    .sort(
      (a, b) =>
        Number(a.status === 'ARCHIVED') - Number(b.status === 'ARCHIVED') ||
        a.name.localeCompare(b.name),
    );
}
