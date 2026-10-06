import type { ProjectResponse, ProjectStatus } from '@nexus/types';

export type ProjectFilter = 'all' | 'active' | 'completed' | 'archived';

export const PROJECT_FILTERS: ReadonlyArray<{
  value: ProjectFilter;
  label: string;
  status?: ProjectStatus;
}> = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active', status: 'ACTIVE' },
  { value: 'completed', label: 'Completed', status: 'COMPLETED' },
  { value: 'archived', label: 'Archived', status: 'ARCHIVED' },
];

export function parseProjectFilter(value: unknown): ProjectFilter {
  return PROJECT_FILTERS.some((filter) => filter.value === value)
    ? (value as ProjectFilter)
    : 'all';
}

const STATUS_ORDER: Record<ProjectStatus, number> = {
  ACTIVE: 0,
  COMPLETED: 1,
  ARCHIVED: 2,
};

/** Active work first, then by most recent activity. */
export function sortProjects(projects: ProjectResponse[]): ProjectResponse[] {
  return [...projects].sort(
    (a, b) =>
      STATUS_ORDER[a.status] - STATUS_ORDER[b.status] ||
      Date.parse(b.updatedAt) - Date.parse(a.updatedAt),
  );
}

export function filterProjects(
  projects: ProjectResponse[],
  filter: ProjectFilter,
): ProjectResponse[] {
  const status = PROJECT_FILTERS.find((f) => f.value === filter)?.status;
  return status ? projects.filter((p) => p.status === status) : projects;
}
