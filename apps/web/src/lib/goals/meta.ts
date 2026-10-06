import type { GoalStatus } from '@nexus/types';
import type { BadgeTone } from '@nexus/ui';

/** UI labels for the API's goal statuses; the enum values never change. */
export const GOAL_STATUS_META: Record<
  GoalStatus,
  { label: string; tone: BadgeTone; description: string }
> = {
  ACTIVE: {
    label: 'Active',
    tone: 'accent',
    description: 'Being worked toward',
  },
  PAUSED: {
    label: 'Paused',
    tone: 'warning',
    description: 'On hold for now',
  },
  COMPLETED: {
    label: 'Achieved',
    tone: 'success',
    description: 'Reached',
  },
  ARCHIVED: {
    label: 'Archived',
    tone: 'neutral',
    description: 'Kept for reference',
  },
};

export const GOAL_STATUS_OPTIONS = (
  Object.keys(GOAL_STATUS_META) as GoalStatus[]
).map((value) => ({ value, label: GOAL_STATUS_META[value].label }));
