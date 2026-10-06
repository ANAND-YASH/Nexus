import type { GoalStatus } from '@nexus/types';
import { isDateKey } from '../dates';
import { GOAL_STATUS_META } from './meta';

/** Mirror the API's limits (NAME_MAX_LENGTH / DESCRIPTION_MAX_LENGTH). */
export const GOAL_TITLE_MAX = 200;
export const GOAL_DESCRIPTION_MAX = 10_000;

export interface GoalInput {
  title: string;
  description: string | null;
  status: GoalStatus;
  /** `YYYY-MM-DD`, or null for no target date. */
  targetDate: string | null;
}

export type GoalField = 'title' | 'description' | 'status' | 'targetDate';
export type GoalFieldErrors = Partial<Record<GoalField, string>>;

export interface RawGoalForm {
  title: string;
  description: string;
  status: string;
  targetDate: string;
}

/** Shared by the form (instant feedback) and the action (authoritative). */
export function validateGoal(
  raw: RawGoalForm,
): { input: GoalInput; errors?: undefined } | { errors: GoalFieldErrors } {
  const title = raw.title.trim();
  const description = raw.description.trim();
  const targetDate = raw.targetDate.trim();
  const errors: GoalFieldErrors = {};

  if (!title) errors.title = 'Describe the outcome you’re aiming for.';
  else if (title.length > GOAL_TITLE_MAX) {
    errors.title = `Keep the title under ${GOAL_TITLE_MAX} characters.`;
  }
  if (description.length > GOAL_DESCRIPTION_MAX) {
    errors.description = `Keep the description under ${GOAL_DESCRIPTION_MAX.toLocaleString('en')} characters.`;
  }
  if (!(raw.status in GOAL_STATUS_META)) errors.status = 'Choose a status.';
  if (targetDate && !isDateKey(targetDate)) {
    errors.targetDate = 'Enter a valid date.';
  }

  if (Object.keys(errors).length > 0) return { errors };
  return {
    input: {
      title,
      description: description || null,
      status: raw.status as GoalStatus,
      targetDate: targetDate || null,
    },
  };
}

export function readGoalForm(formData: FormData): RawGoalForm {
  const field = (name: string) => String(formData.get(name) ?? '');
  return {
    title: field('title'),
    description: field('description'),
    status: field('status'),
    targetDate: field('targetDate'),
  };
}
