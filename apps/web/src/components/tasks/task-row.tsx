import type { TaskResponse } from '@nexus/types';
import { cn } from '@nexus/ui';
import Link from 'next/link';
import { LocalDate } from '@/components/local-date';
import { TASK_STATUS_META } from '@/lib/tasks/meta';
import { isOpenTask } from '@/lib/tasks/order';
import { DueLabel } from './due-label';
import { PriorityIndicator } from './priority-indicator';
import { TaskStatusToggle } from './task-status-toggle';

function Schedule({ task }: { task: TaskResponse }) {
  if (task.status === 'COMPLETED' && task.completedAt) {
    return (
      <span className="text-xs whitespace-nowrap text-fg-subtle tabular-nums">
        Done <LocalDate value={task.completedAt} />
      </span>
    );
  }
  return <DueLabel dueAt={task.dueAt} open={isOpenTask(task)} />;
}

/**
 * One task in a list: complete/reopen toggle, title (links to the task),
 * status, project, priority and due date. Used by the Tasks list, project
 * pages and the dashboard so a task always looks the same.
 */
export function TaskRow({
  task,
  project,
}: {
  task: TaskResponse;
  /** The task's project, when it should be shown (and linked). */
  project?: { id: string; name: string } | null;
}) {
  const closed = !isOpenTask(task);

  return (
    <li className="group relative flex items-start gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-surface-muted/70">
      <TaskStatusToggle
        task={task}
        className="relative z-10 -my-0.5 shrink-0"
      />
      <div className="min-w-0 flex-1">
        <Link
          href={`/tasks/${task.id}`}
          className={cn(
            'block truncate text-[13px] font-medium after:absolute after:inset-0 after:rounded-lg focus-visible:outline-none focus-visible:after:outline-2 focus-visible:after:outline-ring',
            closed ? 'text-fg-muted' : 'text-fg',
            task.status === 'CANCELLED' && 'line-through',
          )}
        >
          {task.title}
        </Link>
        <div className="mt-0.5 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-xs text-fg-subtle">
          <span>{TASK_STATUS_META[task.status].label}</span>
          {project && (
            <>
              <span aria-hidden>·</span>
              <Link
                href={`/projects/${project.id}`}
                className="relative z-10 max-w-48 truncate rounded-sm hover:text-fg hover:underline"
              >
                {project.name}
              </Link>
            </>
          )}
          {/* Narrow screens: priority and schedule move under the title. */}
          <span className="flex items-center gap-2 sm:hidden">
            <PriorityIndicator priority={task.priority} />
            <Schedule task={task} />
          </span>
        </div>
      </div>
      <div className="hidden shrink-0 items-center gap-4 pt-0.5 sm:flex">
        <PriorityIndicator priority={task.priority} className="w-16" />
        <span className="flex w-36 justify-end">
          <Schedule task={task} />
        </span>
      </div>
    </li>
  );
}
