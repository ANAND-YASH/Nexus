import type { GoalResponse } from '@nexus/types';
import type { Goal } from './goal.entity';

/** Public shape: no owner or relation data. */
export function toGoalResponse(goal: Goal): GoalResponse {
  return {
    id: goal.id,
    title: goal.title,
    description: goal.description,
    status: goal.status,
    targetDate: goal.targetDate,
    createdAt: goal.createdAt.toISOString(),
    updatedAt: goal.updatedAt.toISOString(),
  };
}
