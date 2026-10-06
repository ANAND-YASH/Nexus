import { Card, cn, EmptyState, LoadingState, Skeleton } from '@nexus/ui';
import Link from 'next/link';
import { TasksIcon } from '@/components/icons';
import { listTasksWhere } from '@/lib/api/tasks';
import { listProjects } from '@/lib/api/workspace';
import {
  applyTaskFilters,
  hasNarrowingFilters,
  STATUS_FILTERS,
  taskFiltersHref,
  type TaskFilters as Filters,
} from '@/lib/tasks/filters';
import { toProjectOptions } from '@/lib/tasks/project-options';
import { NewTaskButton } from './new-task-button';
import { TaskFilters } from './task-filters';
import { TaskRow } from './task-row';

export async function TaskList({ filters }: { filters: Filters }) {
  // Priority and project are filtered by the API; "open" (two statuses)
  // and "no project" aren't API filters, so those are applied here.
  const apiProject =
    filters.project && filters.project !== 'none' ? filters.project : null;
  const [tasks, projects] = await Promise.all([
    listTasksWhere(filters.priority, apiProject),
    listProjects(),
  ]);
  const options = toProjectOptions(projects);

  if (tasks.length === 0 && !hasNarrowingFilters(filters)) {
    return (
      <Card>
        <EmptyState
          size="page"
          titleAs="h2"
          tone="accent"
          icon={<TasksIcon />}
          title="Plan your first task"
          description="Capture what needs doing, give it a priority and a due date, and attach it to a project to track progress."
          action={<NewTaskButton projects={options} />}
        />
      </Card>
    );
  }

  const scoped = applyTaskFilters(tasks, { ...filters, status: 'all' });
  const visible = applyTaskFilters(tasks, filters);
  const projectsById = new Map(projects.map((p) => [p.id, p]));
  const statusLabel = STATUS_FILTERS.find((f) => f.value === filters.status)!;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <nav
          aria-label="Filter tasks by status"
          className="-mx-1 overflow-x-auto px-1 pb-1"
        >
          <ul className="flex w-max gap-1 rounded-lg bg-surface-muted p-1">
            {STATUS_FILTERS.map((option) => {
              const current = option.value === filters.status;
              return (
                <li key={option.value}>
                  <Link
                    href={taskFiltersHref({ ...filters, status: option.value })}
                    scroll={false}
                    aria-current={current ? 'page' : undefined}
                    className={cn(
                      'flex h-7 items-center gap-1.5 rounded-md px-3 text-xs font-medium whitespace-nowrap transition-colors',
                      current
                        ? 'bg-surface text-fg shadow-xs'
                        : 'text-fg-muted hover:text-fg',
                    )}
                  >
                    {option.label}
                    <span className="text-fg-subtle tabular-nums">
                      {scoped.filter(option.matches).length}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
        <TaskFilters filters={filters} projects={options} />
      </div>

      {visible.length === 0 ? (
        <Card>
          <EmptyState
            icon={<TasksIcon />}
            title={
              filters.status === 'open' && !hasNarrowingFilters(filters)
                ? 'Nothing open'
                : 'No tasks match these filters'
            }
            description={
              filters.status === 'open' && !hasNarrowingFilters(filters)
                ? 'Every task is completed or cancelled.'
                : `No ${statusLabel.label.toLowerCase()} tasks with this priority or project.`
            }
            action={
              <Link
                href={taskFiltersHref({
                  status: 'all',
                  priority: null,
                  project: null,
                  sort: filters.sort,
                })}
                scroll={false}
                className="text-[13px] font-medium text-accent-text underline-offset-4 hover:underline"
              >
                Show all tasks
              </Link>
            }
          />
        </Card>
      ) : (
        <Card>
          <h2 className="sr-only">
            {visible.length} {visible.length === 1 ? 'task' : 'tasks'}
          </h2>
          <ul className="divide-y divide-border p-2">
            {visible.map((task) => (
              <TaskRow
                key={task.id}
                task={task}
                project={
                  task.projectId ? projectsById.get(task.projectId) : null
                }
              />
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}

export function TaskListSkeleton() {
  return (
    <LoadingState label="Loading tasks…">
      <div className="space-y-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <Skeleton className="h-9 w-[28rem] max-w-full rounded-lg" />
          <Skeleton className="h-9 w-96 max-w-full rounded-lg" />
        </div>
        <Card className="p-2">
          {Array.from({ length: 7 }, (_, index) => (
            <div key={index} className="flex items-center gap-3 px-3 py-3">
              <Skeleton className="size-4 rounded-full" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-3.5 w-2/3 max-w-sm" />
                <Skeleton className="h-3 w-32" />
              </div>
              <Skeleton className="hidden h-3.5 w-16 sm:block" />
              <Skeleton className="hidden h-3.5 w-24 sm:block" />
            </div>
          ))}
        </Card>
      </div>
    </LoadingState>
  );
}
