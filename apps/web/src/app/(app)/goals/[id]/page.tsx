import { Card, CardHeader, cn } from '@nexus/ui';
import type { Metadata } from 'next';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { GoalActions } from '@/components/goals/goal-actions';
import { GoalStatusBadge } from '@/components/goals/goal-status-badge';
import { GoalStatusField } from '@/components/goals/goal-status-field';
import { TargetDateLabel } from '@/components/goals/target-date-label';
import { LocalDate } from '@/components/local-date';
import { getGoal } from '@/lib/api/goals';

export async function generateMetadata({
  params,
}: PageProps<'/goals/[id]'>): Promise<Metadata> {
  const { id } = await params;
  return { title: (await getGoal(id)).title };
}

function Detail({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-2.5">
      <dt className="shrink-0 text-xs text-fg-subtle">{label}</dt>
      <dd className="min-w-0 text-right text-[13px] text-fg">{children}</dd>
    </div>
  );
}

export default async function GoalPage({ params }: PageProps<'/goals/[id]'>) {
  const { id } = await params;
  const goal = await getGoal(id);
  const settled = goal.status === 'COMPLETED' || goal.status === 'ARCHIVED';

  return (
    <div className="space-y-6">
      <nav aria-label="Breadcrumb">
        <ol className="flex min-w-0 items-center gap-1.5 text-[13px] text-fg-muted">
          <li>
            <Link
              href="/goals"
              className="rounded-sm transition-colors hover:text-fg"
            >
              Goals
            </Link>
          </li>
          <li aria-hidden className="text-fg-subtle">
            /
          </li>
          <li aria-current="page" className="min-w-0 truncate text-fg">
            {goal.title}
          </li>
        </ol>
      </nav>

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-3">
        <Card
          as="section"
          aria-labelledby="goal-heading"
          className="min-w-0 p-5 sm:p-6 lg:col-span-2"
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <GoalStatusBadge status={goal.status} />
              <h2
                id="goal-heading"
                className={cn(
                  'mt-3 text-2xl leading-tight font-semibold tracking-tight break-words',
                  settled ? 'text-fg-muted' : 'text-fg',
                )}
              >
                {goal.title}
              </h2>
              <div className="mt-3">
                <TargetDateLabel
                  targetDate={goal.targetDate}
                  status={goal.status}
                  showEmpty
                />
              </div>
            </div>
            <GoalActions goal={goal} />
          </div>
          {goal.description ? (
            <p className="mt-6 max-w-3xl text-sm leading-6 break-words whitespace-pre-line text-fg-muted">
              {goal.description}
            </p>
          ) : (
            <p className="mt-6 text-sm text-fg-subtle italic">
              No description yet. Add why this goal matters and what success
              looks like.
            </p>
          )}
        </Card>

        <Card
          as="section"
          aria-labelledby="goal-details-title"
          className="min-w-0"
        >
          <CardHeader title="Details" titleId="goal-details-title" />
          <div className="px-5 pb-5">
            <GoalStatusField goal={goal} />
            <dl className="mt-2 divide-y divide-border border-t border-border">
              <Detail label="Target date">
                {goal.targetDate ? (
                  <LocalDate value={goal.targetDate} dateOnly />
                ) : (
                  <span className="text-fg-subtle">None</span>
                )}
              </Detail>
              <Detail label="Created">
                <LocalDate value={goal.createdAt} withTime />
              </Detail>
              <Detail label="Updated">
                <LocalDate value={goal.updatedAt} withTime />
              </Detail>
            </dl>
          </div>
        </Card>
      </div>
    </div>
  );
}
