import { Badge, EmptyState } from '@nexus/ui';
import { GoalsIcon } from '@/components/icons';
import { LocalDate } from '@/components/local-date';
import { listGoals } from '@/lib/api/workspace';
import { activeGoals } from '@/lib/dashboard';
import { PanelList } from '@/components/section-panel';

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
            : 'Your goals are completed, paused or archived.'
        }
      />
    );
  }

  return (
    <PanelList>
      {active.map(({ goal, pastTarget }) => (
        <li key={goal.id} className="flex items-start gap-3 px-3 py-2.5">
          <GoalsIcon
            width={16}
            height={16}
            className="mt-0.5 shrink-0 text-accent-text"
          />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-medium text-fg">
              {goal.title}
            </p>
            <p className="text-xs text-fg-subtle">
              {goal.targetDate ? (
                <>
                  Target <LocalDate value={goal.targetDate} dateOnly />
                </>
              ) : (
                'No target date'
              )}
            </p>
          </div>
          {pastTarget && <Badge tone="warning">Past target</Badge>}
        </li>
      ))}
    </PanelList>
  );
}
