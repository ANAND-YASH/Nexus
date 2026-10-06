import type { Metadata } from 'next';
import { Suspense } from 'react';
import { GoalsOverview } from '@/components/dashboard/goals';
import { InsightsPlaceholder } from '@/components/dashboard/insights';
import { RecentKnowledge } from '@/components/dashboard/knowledge';
import { SectionPanel } from '@/components/section-panel';
import { ActiveProjects } from '@/components/dashboard/projects';
import {
  DashboardStats,
  DashboardStatsSkeleton,
} from '@/components/dashboard/stats';
import { UpNext } from '@/components/dashboard/up-next';
import { SectionBoundary } from '@/components/states/section-boundary';

export const metadata: Metadata = { title: 'Dashboard' };

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <p className="text-sm text-fg-muted">
        Everything in your workspace at a glance, live from your projects,
        tasks, goals and knowledge.
      </p>

      <section aria-labelledby="summary-title">
        <h2 id="summary-title" className="sr-only">
          Summary
        </h2>
        <SectionBoundary subject="your workspace summary">
          <Suspense fallback={<DashboardStatsSkeleton />}>
            <DashboardStats />
          </Suspense>
        </SectionBoundary>
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <SectionPanel
          id="up-next"
          title="Up next"
          description="Open tasks, soonest due first"
          href="/tasks"
          subject="your tasks"
          rows={6}
          className="lg:col-span-2"
        >
          <UpNext />
        </SectionPanel>
        <SectionPanel
          id="goals"
          title="Goals"
          description="Active, by target date"
          href="/goals"
          subject="your goals"
        >
          <GoalsOverview />
        </SectionPanel>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <SectionPanel
          id="projects"
          title="Active projects"
          description="Progress from each project’s tasks"
          href="/projects"
          subject="your projects"
        >
          <ActiveProjects />
        </SectionPanel>
        <SectionPanel
          id="knowledge"
          title="Recent knowledge"
          description="Latest documents"
          href="/knowledge"
          subject="your documents"
        >
          <RecentKnowledge />
        </SectionPanel>
      </div>

      <InsightsPlaceholder />
    </div>
  );
}
