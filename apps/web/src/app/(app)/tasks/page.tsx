import type { Metadata } from 'next';
import { unstable_rethrow } from 'next/navigation';
import { Suspense } from 'react';
import { PageIntro } from '@/components/page-intro';
import { SectionBoundary } from '@/components/states/section-boundary';
import { NewTaskButton } from '@/components/tasks/new-task-button';
import { TaskList, TaskListSkeleton } from '@/components/tasks/task-list';
import { listProjects } from '@/lib/api/workspace';
import { parseTaskFilters, taskFiltersHref } from '@/lib/tasks/filters';
import { toProjectOptions } from '@/lib/tasks/project-options';

export const metadata: Metadata = { title: 'Tasks' };

/**
 * Header action: needs the project list, so it streams on its own. If that
 * fails the list below shows the error (with retry), so render nothing here.
 */
async function NewTaskAction({ projectId }: { projectId: string | null }) {
  let projects;
  try {
    projects = await listProjects();
  } catch (error) {
    unstable_rethrow(error);
    return null;
  }
  return (
    <NewTaskButton
      projects={toProjectOptions(projects)}
      defaultProjectId={projectId}
    />
  );
}

export default async function TasksPage({ searchParams }: PageProps<'/tasks'>) {
  const filters = parseTaskFilters(await searchParams);
  const projectId =
    filters.project && filters.project !== 'none' ? filters.project : null;

  return (
    <div className="space-y-6">
      <PageIntro
        description="Everything you need to do, across projects. Open tasks are ordered by when they’re due."
        actions={
          <Suspense fallback={null}>
            <NewTaskAction projectId={projectId} />
          </Suspense>
        }
      />
      <SectionBoundary subject="your tasks" size="page">
        <Suspense
          key={taskFiltersHref(filters)}
          fallback={<TaskListSkeleton />}
        >
          <TaskList filters={filters} />
        </Suspense>
      </SectionBoundary>
    </div>
  );
}
