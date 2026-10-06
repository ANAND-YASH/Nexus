import { Card, cn, EmptyState, LoadingState, Skeleton } from '@nexus/ui';
import Link from 'next/link';
import { GoalsIcon } from '@/components/icons';
import { listGoals } from '@/lib/api/workspace';
import {
  applyGoalFilters,
  countByStatus,
  GOAL_SORTS,
  GOAL_STATUS_FILTERS,
  goalFiltersHref,
  type GoalFilters,
} from '@/lib/goals/filters';
import { GoalCard } from './goal-card';
import { NewGoalButton } from './new-goal-button';

function Segmented<T extends string>({
  label,
  options,
  current,
  href,
  counts,
}: {
  label: string;
  options: ReadonlyArray<{ value: T; label: string }>;
  current: T;
  href: (value: T) => string;
  counts?: (value: T) => number;
}) {
  return (
    <nav aria-label={label} className="-mx-1 overflow-x-auto px-1 pb-1">
      <ul className="flex w-max gap-1 rounded-lg bg-surface-muted p-1">
        {options.map((option) => {
          const active = option.value === current;
          return (
            <li key={option.value}>
              <Link
                href={href(option.value)}
                scroll={false}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex h-7 items-center gap-1.5 rounded-md px-3 text-xs font-medium whitespace-nowrap transition-colors',
                  active
                    ? 'bg-surface text-fg shadow-xs'
                    : 'text-fg-muted hover:text-fg',
                )}
              >
                {option.label}
                {counts && (
                  <span className="text-fg-subtle tabular-nums">
                    {counts(option.value)}
                  </span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export async function GoalList({ filters }: { filters: GoalFilters }) {
  // One request: counts need every goal, so status is filtered here rather
  // than with the API's `?status=`.
  const goals = await listGoals();

  if (goals.length === 0) {
    return (
      <Card>
        <EmptyState
          size="page"
          titleAs="h2"
          tone="accent"
          icon={<GoalsIcon />}
          title="Set your first goal"
          description="A goal is an outcome you want to reach — like launching a product or finishing a course. Give it a target date to keep it in view."
          action={<NewGoalButton />}
        />
      </Card>
    );
  }

  const visible = applyGoalFilters(goals, filters);
  const statusLabel = GOAL_STATUS_FILTERS.find(
    (f) => f.value === filters.status,
  )!;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <Segmented
          label="Filter goals by status"
          options={GOAL_STATUS_FILTERS}
          current={filters.status}
          href={(status) => goalFiltersHref({ ...filters, status })}
          counts={(status) => countByStatus(goals, status)}
        />
        <div className="flex items-center gap-2">
          <span className="pb-1 text-xs text-fg-subtle" aria-hidden>
            Sort
          </span>
          <Segmented
            label="Sort goals"
            options={GOAL_SORTS}
            current={filters.sort}
            href={(sort) => goalFiltersHref({ ...filters, sort })}
          />
        </div>
      </div>

      {visible.length === 0 ? (
        <Card>
          <EmptyState
            icon={<GoalsIcon />}
            title={`No ${statusLabel.label.toLowerCase()} goals`}
            description="Goals with this status will appear here."
            action={
              <Link
                href={goalFiltersHref({ ...filters, status: 'all' })}
                scroll={false}
                className="text-[13px] font-medium text-accent-text underline-offset-4 hover:underline"
              >
                Show all goals
              </Link>
            }
          />
        </Card>
      ) : (
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {visible.map((goal) => (
            <GoalCard key={goal.id} goal={goal} />
          ))}
        </ul>
      )}
    </div>
  );
}

export function GoalListSkeleton() {
  return (
    <LoadingState label="Loading goals…">
      <div className="space-y-4">
        <div className="flex flex-col gap-3 md:flex-row md:justify-between">
          <Skeleton className="h-9 w-96 max-w-full rounded-lg" />
          <Skeleton className="h-9 w-72 max-w-full rounded-lg" />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }, (_, index) => (
            <Card key={index} className="p-5">
              <Skeleton className="h-5 w-20" />
              <Skeleton className="mt-4 h-5 w-3/4" />
              <Skeleton className="mt-3 h-3.5 w-36" />
              <Skeleton className="mt-4 h-3.5 w-full" />
              <Skeleton className="mt-1.5 h-3.5 w-2/3" />
            </Card>
          ))}
        </div>
      </div>
    </LoadingState>
  );
}
