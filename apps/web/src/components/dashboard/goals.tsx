import { EmptyState } from '@nexus/ui';
import Link from 'next/link';
import { TargetDateLabel } from '@/components/goals/target-date-label';
import { GoalsIcon } from '@/components/icons';
import { PanelList } from '@/components/section-panel';
import { listGoals } from '@/lib/api/workspace';
import { activeGoals } from '@/lib/goals/target';

const LIMIT = 5;

export async function GoalsOverview() {
  const goals = await listGoals();
  const active = activeGoals(goals, LIMIT);

  if (active.length === 0) {
    return (
      <EmptyState
        icon={<GoalsIcon />}
        title="No active goals"
        description={
          goals.length === 0
            ? 'Set a goal to give your projects and tasks a direction.'
            : 'Your goals are achieved, paused or archived.'
        }
      />
    );
  }

  return (
    <PanelList>
      {active.map((goal) => (
        <li key={goal.id}>
          <Link
            href={`/goals/${goal.id}`}
            className="flex items-start gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-surface-muted"
          >
            <GoalsIcon
              width={16}
              height={16}
              className="mt-0.5 shrink-0 text-accent-text"
            />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[13px] font-medium text-fg">
                {goal.title}
              </span>
              <span className="mt-1 flex">
                <TargetDateLabel
                  targetDate={goal.targetDate}
                  status={goal.status}
                  showEmpty
                />
              </span>
            </span>
          </Link>
        </li>
      ))}
    </PanelList>
  );
}
