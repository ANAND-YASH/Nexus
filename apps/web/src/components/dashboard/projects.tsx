import { EmptyState, Progress } from '@nexus/ui';
import Link from 'next/link';
import { ProjectsIcon } from '@/components/icons';
import { PanelList } from '@/components/section-panel';
import { listProjects, listTasks } from '@/lib/api/workspace';
import { activeProjectProgress } from '@/lib/dashboard';
import { progressLabel } from '@/lib/projects/progress';

const LIMIT = 5;

export async function ActiveProjects() {
  const [projects, tasks] = await Promise.all([listProjects(), listTasks()]);
  const active = activeProjectProgress(projects, tasks, LIMIT);

  if (active.length === 0) {
    return (
      <EmptyState
        icon={<ProjectsIcon />}
        title="No active projects"
        description={
          projects.length === 0
            ? 'Projects group related tasks and documents. Your first one will show up here.'
            : 'All of your projects are completed or archived.'
        }
      />
    );
  }

  return (
    <PanelList>
      {active.map(({ project, progress }) => (
        <li key={project.id}>
          <Link
            href={`/projects/${project.id}`}
            className="block rounded-lg px-3 py-3 transition-colors hover:bg-surface-muted"
          >
            <span className="flex items-baseline justify-between gap-3">
              <span className="truncate text-[13px] font-medium text-fg">
                {project.name}
              </span>
              <span className="shrink-0 text-xs text-fg-muted tabular-nums">
                {progressLabel(progress)}
                {progress.total > 0 && ` · ${progress.open} open`}
              </span>
            </span>
            {progress.total > 0 && (
              <Progress
                className="mt-2"
                value={progress.completed}
                max={progress.total}
                label={`${project.name} progress`}
                valueText={progressLabel(progress)}
              />
            )}
          </Link>
        </li>
      ))}
    </PanelList>
  );
}
