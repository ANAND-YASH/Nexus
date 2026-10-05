export const GoalStatus = {
  ACTIVE: 'ACTIVE',
  COMPLETED: 'COMPLETED',
  PAUSED: 'PAUSED',
  ARCHIVED: 'ARCHIVED',
} as const;
export type GoalStatus = (typeof GoalStatus)[keyof typeof GoalStatus];

export interface GoalResponse {
  id: string;
  title: string;
  description: string | null;
  status: GoalStatus;
  /** Calendar date, `YYYY-MM-DD`. */
  targetDate: string | null;
  /** ISO 8601 timestamp. */
  createdAt: string;
  /** ISO 8601 timestamp. */
  updatedAt: string;
}

export interface CreateGoalRequest {
  title: string;
  description?: string | null;
  /** Defaults to ACTIVE. */
  status?: GoalStatus;
  /** Calendar date, `YYYY-MM-DD`. */
  targetDate?: string | null;
}

/** Omitted fields are left unchanged; `null` clears a nullable field. */
export type UpdateGoalRequest = Partial<CreateGoalRequest>;

export interface ListGoalsQuery {
  status?: GoalStatus;
}
