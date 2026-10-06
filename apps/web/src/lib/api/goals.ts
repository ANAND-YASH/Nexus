import type {
  CreateGoalRequest,
  GoalResponse,
  UpdateGoalRequest,
} from '@nexus/types';
import { notFound } from 'next/navigation';
import { cache } from 'react';
import { authedGet, authedRequest } from './authed';
import { isUuid, notFoundOn404 } from './ids';

/** One of the caller's goals, or the not-found page. */
export const getGoal = cache((id: string): Promise<GoalResponse> => {
  if (!isUuid(id)) notFound();
  return authedGet<GoalResponse>(`/api/goals/${id}`).catch(notFoundOn404);
});

export function createGoal(body: CreateGoalRequest): Promise<GoalResponse> {
  return authedRequest('/api/goals', { method: 'POST', body });
}

export function updateGoal(
  id: string,
  body: UpdateGoalRequest,
): Promise<GoalResponse> {
  return authedRequest(`/api/goals/${id}`, { method: 'PATCH', body });
}

/**
 * Permanent. Only the goal goes: no projects or tasks reference goals.
 * Its document links and context relationships are removed with it.
 */
export function deleteGoal(id: string): Promise<void> {
  return authedRequest(`/api/goals/${id}`, { method: 'DELETE' });
}
