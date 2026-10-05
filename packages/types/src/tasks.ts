export const TaskStatus = {
  TODO: 'TODO',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
} as const;
export type TaskStatus = (typeof TaskStatus)[keyof typeof TaskStatus];

export const TaskPriority = {
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
  URGENT: 'URGENT',
} as const;
export type TaskPriority = (typeof TaskPriority)[keyof typeof TaskPriority];

export interface TaskResponse {
  id: string;
  projectId: string | null;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  /** ISO 8601 timestamp. */
  dueAt: string | null;
  /** ISO 8601 timestamp; set by the server when status becomes COMPLETED. */
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTaskRequest {
  title: string;
  description?: string | null;
  /** Must be one of the caller's own projects. */
  projectId?: string | null;
  /** Defaults to TODO. */
  status?: TaskStatus;
  /** Defaults to MEDIUM. */
  priority?: TaskPriority;
  /** ISO 8601 timestamp. */
  dueAt?: string | null;
}

/** Omitted fields are left unchanged; `null` clears a nullable field. */
export type UpdateTaskRequest = Partial<CreateTaskRequest>;

export interface ListTasksQuery {
  status?: TaskStatus;
  priority?: TaskPriority;
  projectId?: string;
}
