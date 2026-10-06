import { Card, CardHeader } from '@nexus/ui';
import type { Metadata } from 'next';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { ProjectsIcon } from '@/components/icons';
import { LocalDate } from '@/components/local-date';
import { DueLabel } from '@/components/tasks/due-label';
import { PriorityIndicator } from '@/components/tasks/priority-indicator';
import { TaskActions } from '@/components/tasks/task-actions';
import { TaskQuickFields } from '@/components/tasks/task-quick-fields';
import { TaskStatusBadge } from '@/components/tasks/task-status-badge';
import { getTask } from '@/lib/api/tasks';
import { listProjects } from '@/lib/api/workspace';
import { isOpenTask } from '@/lib/tasks/order';
import { toProjectOptions } from '@/lib/tasks/project-options';

export async function generateMetadata({
  params,
}: PageProps<'/tasks/[id]'>): Promise<Metadata> {
  const { id } = await params;
  return { title: (await getTask(id)).title };
}

function Detail({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-2.5">
      <dt className="shrink-0 text-xs text-fg-subtle">{label}</dt>
      <dd className="min-w-0 text-right text-[13px] text-fg">{children}</dd>
    </div>
  );
}

export default async function TaskPage({ params }: PageProps<'/tasks/[id]'>) {
  const { id } = await params;
  const [task, projects] = await Promise.all([getTask(id), listProjects()]);
  const project = task.projectId
    ? projects.find((p) => p.id === task.projectId)
    : undefined;
  const open = isOpenTask(task);

  return (
    <div className="space-y-6">
      <nav aria-label="Breadcrumb">
        <ol className="flex min-w-0 items-center gap-1.5 text-[13px] text-fg-muted">
          <li>
            <Link
              href="/tasks"
              className="rounded-sm transition-colors hover:text-fg"
            >
              Tasks
            </Link>
          </li>
          <li aria-hidden className="text-fg-subtle">
            /
          </li>
          <li aria-current="page" className="min-w-0 truncate text-fg">
            {task.title}
          </li>
        </ol>
      </nav>

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-3">
        <Card
          as="section"
          aria-labelledby="task-heading"
          className="min-w-0 p-5 sm:p-6 lg:col-span-2"
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <h2
                id="task-heading"
                className={
                  task.status === 'CANCELLED'
                    ? 'text-xl font-semibold tracking-tight break-words text-fg-muted line-through'
                    : 'text-xl font-semibold tracking-tight break-words text-fg'
                }
              >
                {task.title}
              </h2>
              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-2">
                <TaskStatusBadge status={task.status} />
                <PriorityIndicator priority={task.priority} />
                <DueLabel dueAt={task.dueAt} open={open} />
              </div>
            </div>
            <TaskActions task={task} projects={toProjectOptions(projects)} />
          </div>
          {task.description ? (
            <p className="mt-6 max-w-3xl text-sm leading-6 break-words whitespace-pre-line text-fg-muted">
              {task.description}
            </p>
          ) : (
            <p className="mt-6 text-sm text-fg-subtle italic">
              No description yet.
            </p>
          )}
        </Card>

        <Card
          as="section"
          aria-labelledby="task-details-title"
          className="min-w-0"
        >
          <CardHeader title="Details" titleId="task-details-title" />
          <div className="px-5 pb-5">
            <TaskQuickFields task={task} />
            <dl className="mt-2 divide-y divide-border border-t border-border">
              <Detail label="Project">
                {project ? (
                  <Link
                    href={`/projects/${project.id}`}
                    className="inline-flex max-w-full items-center gap-1.5 font-medium text-accent-text underline-offset-4 hover:underline"
                  >
                    <ProjectsIcon width={14} height={14} className="shrink-0" />
                    <span className="truncate">{project.name}</span>
                  </Link>
                ) : (
                  <span className="text-fg-subtle">No project</span>
                )}
              </Detail>
              <Detail label="Due">
                {task.dueAt ? (
                  <LocalDate value={task.dueAt} withTime />
                ) : (
                  <span className="text-fg-subtle">No due date</span>
                )}
              </Detail>
              {task.completedAt && (
                <Detail label="Completed">
                  <LocalDate value={task.completedAt} withTime />
                </Detail>
              )}
              <Detail label="Created">
                <LocalDate value={task.createdAt} withTime />
              </Detail>
              <Detail label="Updated">
                <LocalDate value={task.updatedAt} withTime />
              </Detail>
            </dl>
          </div>
        </Card>
      </div>
    </div>
  );
}
