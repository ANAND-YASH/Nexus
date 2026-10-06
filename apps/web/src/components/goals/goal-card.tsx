import type { GoalResponse, GoalStatus } from '@nexus/types';
import { Card, cn } from '@nexus/ui';
import Link from 'next/link';
import { LocalDate } from '@/components/local-date';
import { GoalStatusBadge } from './goal-status-badge';
import { TargetDateLabel } from './target-date-label';

/** A status-colored edge marks each goal at a glance (the badge names it). */
const EDGE: Record<GoalStatus, string> = {
  ACTIVE: 'before:bg-accent',
  PAUSED: 'before:bg-warning',
  COMPLETED: 'before:bg-success',
  ARCHIVED: 'before:bg-border-strong',
};

export function GoalCard({ goal }: { goal: GoalResponse }) {
  const settled = goal.status === 'COMPLETED' || goal.status === 'ARCHIVED';

  return (
    <li>
      <Card
        className={cn(
          'group relative flex h-full flex-col overflow-hidden p-5 pl-6 transition-colors hover:border-border-strong',
          'before:absolute before:inset-y-0 before:left-0 before:w-1',
          EDGE[goal.status],
        )}
      >
        <div className="flex flex-wrap items-center gap-2">
          <GoalStatusBadge status={goal.status} />
        </div>
        <h2
          className={cn(
            'mt-3 text-base leading-snug font-semibold tracking-tight',
            settled ? 'text-fg-muted' : 'text-fg',
          )}
        >
          {/* The whole card is the link target; the heading names it. */}
          <Link
            href={`/goals/${goal.id}`}
            className="line-clamp-2 break-words after:absolute after:inset-0 after:rounded-xl focus-visible:outline-none focus-visible:after:outline-2 focus-visible:after:outline-ring"
          >
            {goal.title}
          </Link>
        </h2>
        <div className="mt-2">
          <TargetDateLabel
            targetDate={goal.targetDate}
            status={goal.status}
            showEmpty
          />
        </div>
        {goal.description && (
          <p className="mt-3 line-clamp-3 text-[13px] leading-5 break-words text-fg-muted">
            {goal.description}
          </p>
        )}
        <p className="mt-auto pt-4 text-xs text-fg-subtle">
          Updated <LocalDate value={goal.updatedAt} />
        </p>
      </Card>
    </li>
  );
}
