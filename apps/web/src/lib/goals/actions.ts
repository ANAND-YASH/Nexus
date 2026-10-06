'use server';

import type { GoalStatus } from '@nexus/types';
import { refresh } from 'next/cache';
import { redirect } from 'next/navigation';
import { describeFailure } from '../actions/failure';
import { createGoal, deleteGoal, updateGoal } from '../api/goals';
import { savedState, type FormActionState } from '../forms';
import { GOAL_STATUS_META } from './meta';
import { readGoalForm, validateGoal, type GoalField } from './validation';

export type GoalFormState = FormActionState<GoalField>;

export interface GoalActionResult {
  error?: string;
}

const GOAL_GONE = 'This goal no longer exists. It may have been deleted.';

export async function createGoalAction(
  state: GoalFormState,
  formData: FormData,
): Promise<GoalFormState> {
  const result = validateGoal(readGoalForm(formData));
  if (result.errors)
    return { ...state, error: undefined, fieldErrors: result.errors };

  try {
    const goal = await createGoal(result.input);
    refresh();
    return savedState(state, goal.id);
  } catch (error) {
    return {
      ...state,
      error: describeFailure(error, GOAL_GONE),
      fieldErrors: undefined,
    };
  }
}

export async function updateGoalAction(
  id: string,
  state: GoalFormState,
  formData: FormData,
): Promise<GoalFormState> {
  const result = validateGoal(readGoalForm(formData));
  if (result.errors)
    return { ...state, error: undefined, fieldErrors: result.errors };

  try {
    await updateGoal(id, result.input);
    refresh();
    return savedState(state, id);
  } catch (error) {
    return {
      ...state,
      error: describeFailure(error, GOAL_GONE),
      fieldErrors: undefined,
    };
  }
}

/** Pause, resume, achieve or archive without opening the editor. */
export async function setGoalStatusAction(
  id: string,
  status: GoalStatus,
): Promise<GoalActionResult> {
  // Server Action arguments come from the client: validate the enum.
  if (!(status in GOAL_STATUS_META)) return { error: 'Choose a status.' };
  try {
    await updateGoal(id, { status });
  } catch (error) {
    return { error: describeFailure(error, GOAL_GONE) };
  }
  refresh();
  return {};
}

export async function deleteGoalAction(id: string): Promise<GoalActionResult> {
  try {
    await deleteGoal(id);
  } catch (error) {
    return { error: describeFailure(error, GOAL_GONE) };
  }
  redirect('/goals');
}
