export const ProjectStatus = {
  ACTIVE: 'ACTIVE',
  COMPLETED: 'COMPLETED',
  ARCHIVED: 'ARCHIVED',
} as const;
export type ProjectStatus = (typeof ProjectStatus)[keyof typeof ProjectStatus];

export interface ProjectResponse {
  id: string;
  name: string;
  description: string | null;
  status: ProjectStatus;
  /** ISO 8601 timestamp. */
  createdAt: string;
  /** ISO 8601 timestamp. */
  updatedAt: string;
}

export interface CreateProjectRequest {
  name: string;
  description?: string | null;
  /** Defaults to ACTIVE. */
  status?: ProjectStatus;
}

/** Omitted fields are left unchanged; `null` clears a nullable field. */
export type UpdateProjectRequest = Partial<CreateProjectRequest>;

export interface ListProjectsQuery {
  status?: ProjectStatus;
}
