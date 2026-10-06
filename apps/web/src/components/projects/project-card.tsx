import type { ProjectResponse } from '@nexus/types';
import { Card, Progress } from '@nexus/ui';
import Link from 'next/link';
import { LocalDate } from '@/components/local-date';
import { progressLabel, type TaskProgress } from '@/lib/projects/progress';
import { ProjectStatusBadge } from './project-status-badge';

export function ProjectCard({
  project,
  progress,
}: {
  project: ProjectResponse;
  progress: TaskProgress;
}) {
  return (
    <li>
      <Card className="group relative flex h-full flex-col p-5 transition-colors hover:border-border-strong">
        <div className="flex items-start justify-between gap-3">
          <h2 className="min-w-0 text-sm font-semibold text-fg">
            {/* The whole card is the link target; the heading names it. */}
            <Link
              href={`/projects/${project.id}`}
              className="line-clamp-2 break-words after:absolute after:inset-0 after:rounded-xl focus-visible:outline-none focus-visible:after:outline-2 focus-visible:after:outline-ring"
            >
              {project.name}
            </Link>
          </h2>
          <ProjectStatusBadge status={project.status} />
        </div>
        <p
          className={
            project.description
              ? 'mt-2 line-clamp-2 text-[13px] leading-5 break-words text-fg-muted'
              : 'mt-2 text-[13px] leading-5 text-fg-subtle italic'
          }
        >
          {project.description ?? 'No description'}
        </p>

        <div className="mt-auto pt-5">
          <div className="mb-2 flex items-baseline justify-between gap-3 text-xs">
            <span className="text-fg-muted tabular-nums">
              {progressLabel(progress)}
            </span>
            {progress.open > 0 && (
              <span className="text-fg-subtle tabular-nums">
                {progress.open} open
              </span>
            )}
          </div>
          <Progress
            value={progress.completed}
            max={progress.total}
            label="Task progress"
            valueText={progressLabel(progress)}
          />
          <p className="mt-3 text-xs text-fg-subtle">
            Created <LocalDate value={project.createdAt} />
          </p>
        </div>
      </Card>
    </li>
  );
}
