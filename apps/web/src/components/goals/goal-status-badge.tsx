import type { GoalStatus } from '@nexus/types';
import { Badge } from '@nexus/ui';
import type { ComponentType } from 'react';
import {
  ArchiveIcon,
  GoalsIcon,
  PauseIcon,
  TasksIcon,
  type IconProps,
} from '@/components/icons';
import { GOAL_STATUS_META } from '@/lib/goals/meta';

const STATUS_ICON: Record<GoalStatus, ComponentType<IconProps>> = {
  ACTIVE: GoalsIcon,
  PAUSED: PauseIcon,
  COMPLETED: TasksIcon,
  ARCHIVED: ArchiveIcon,
};

/** Status as icon + word, so it never relies on color alone. */
export function GoalStatusBadge({ status }: { status: GoalStatus }) {
  const Icon = STATUS_ICON[status];
  const meta = GOAL_STATUS_META[status];
  return (
    <Badge tone={meta.tone}>
      <Icon width={12} height={12} className="-ml-0.5" />
      {meta.label}
    </Badge>
  );
}
