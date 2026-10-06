import { Card, cn, EmptyState, LoadingState, Skeleton } from '@nexus/ui';
import Link from 'next/link';
import { ProjectsIcon } from '@/components/icons';
import { listProjects, listTasks } from '@/lib/api/workspace';
import {
  filterProjects,
  PROJECT_FILTERS,
  sortProjects,
  type ProjectFilter,
} from '@/lib/projects/list';
import { taskProgress, tasksByProject } from '@/lib/projects/progress';
import { NewProjectButton } from './new-project-button';
import { ProjectCard } from './project-card';

export async function ProjectList({ filter }: { filter: ProjectFilter }) {
  const [projects, tasks] = await Promise.all([listProjects(), listTasks()]);

  if (projects.length === 0) {
    return (
      <Card>
        <EmptyState
          size="page"
          titleAs="h2"
          tone="accent"
          icon={<ProjectsIcon />}
          title="Start your first project"
          description="Projects bring related tasks, documents and context together, so you can see how the work is going at a glance."
          action={<NewProjectButton />}
        />
      </Card>
    );
  }

  const visible = sortProjects(filterProjects(projects, filter));
  const grouped = tasksByProject(tasks);
  const activeFilter = PROJECT_FILTERS.find((f) => f.value === filter)!;

  return (
    <div className="space-y-4">
      <nav
        aria-label="Filter projects by status"
        className="-mx-1 overflow-x-auto px-1"
      >
        <ul className="flex w-max gap-1 rounded-lg bg-surface-muted p-1">
          {PROJECT_FILTERS.map((option) => {
            const count = filterProjects(projects, option.value).length;
            const current = option.value === filter;
            return (
              <li key={option.value}>
                <Link
                  href={
                    option.value === 'all'
                      ? '/projects'
                      : `/projects?status=${option.value}`
                  }
                  scroll={false}
                  aria-current={current ? 'page' : undefined}
                  className={cn(
                    'flex h-7 items-center gap-1.5 rounded-md px-3 text-xs font-medium transition-colors',
                    current
                      ? 'bg-surface text-fg shadow-xs'
                      : 'text-fg-muted hover:text-fg',
                  )}
                >
                  {option.label}
                  <span className="text-fg-subtle tabular-nums">{count}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {visible.length === 0 ? (
        <Card>
          <EmptyState
            icon={<ProjectsIcon />}
            title={`No ${activeFilter.label.toLowerCase()} projects`}
            description="Projects with this status will appear here."
            action={
              <Link
                href="/projects"
                className="text-[13px] font-medium text-accent-text underline-offset-4 hover:underline"
              >
                Show all projects
              </Link>
            }
          />
        </Card>
      ) : (
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {visible.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              progress={taskProgress(grouped.get(project.id) ?? [])}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

export function ProjectListSkeleton() {
  return (
    <LoadingState label="Loading projects…">
      <div className="space-y-4">
        <Skeleton className="h-9 w-80 max-w-full rounded-lg" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }, (_, index) => (
            <Card key={index} className="p-5">
              <div className="flex justify-between">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-5 w-14" />
              </div>
              <Skeleton className="mt-3 h-3.5 w-full" />
              <Skeleton className="mt-1.5 h-3.5 w-2/3" />
              <Skeleton className="mt-8 h-1.5 w-full rounded-full" />
              <Skeleton className="mt-3 h-3 w-24" />
            </Card>
          ))}
        </div>
      </div>
    </LoadingState>
  );
}
