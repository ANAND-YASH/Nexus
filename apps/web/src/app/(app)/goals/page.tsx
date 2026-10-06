import type { Metadata } from 'next';
import { Suspense } from 'react';
import { GoalList, GoalListSkeleton } from '@/components/goals/goal-list';
import { NewGoalButton } from '@/components/goals/new-goal-button';
import { PageIntro } from '@/components/page-intro';
import { SectionBoundary } from '@/components/states/section-boundary';
import { goalFiltersHref, parseGoalFilters } from '@/lib/goals/filters';

export const metadata: Metadata = { title: 'Goals' };

export default async function GoalsPage({ searchParams }: PageProps<'/goals'>) {
  const filters = parseGoalFilters(await searchParams);

  return (
    <div className="space-y-6">
      <PageIntro
        description="The outcomes you’re working toward. Goals give your projects and tasks a direction — set a target date to keep each one in view."
        actions={<NewGoalButton />}
      />
      <SectionBoundary subject="your goals" size="page">
        <Suspense
          key={goalFiltersHref(filters)}
          fallback={<GoalListSkeleton />}
        >
          <GoalList filters={filters} />
        </Suspense>
      </SectionBoundary>
    </div>
  );
}
