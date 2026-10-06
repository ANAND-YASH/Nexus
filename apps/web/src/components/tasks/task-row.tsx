import type { TaskPriority, TaskResponse, TaskStatus } from '@nexus/types';
import { Badge, cn } from '@nexus/ui';
import { ClockIcon } from '@/components/icons';
import { LocalDate } from '@/components/local-date';

const PRIORITY_BADGE: Partial<
  Record<TaskPriority, { label: string; tone: 'warning' | 'danger' }>
> = {
  URGENT: { label: 'Urgent', tone: 'danger' },
  HIGH: { label: 'High', tone: 'warning' },
};

const STATUS_LABEL: Record<TaskStatus, string> = {
  TODO: 'To do',
  IN_PROGRESS: 'In progress',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
};

function StatusMark({ status }: { status: TaskStatus }) {
  if (status === 'COMPLETED') {
    return (
      <span
        aria-hidden
        className="flex size-3.5 shrink-0 items-center justify-center rounded-full bg-success text-surface"
      >
        <svg viewBox="0 0 12 12" className="size-2.5" fill="none">
          <path
            d="m3 6.2 2 1.9L9 4"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
    );
  }
  return (
    <span
      aria-hidden
      className={cn(
        'size-3.5 shrink-0 rounded-full border-2',
        status === 'IN_PROGRESS' &&
          'border-accent bg-[conic-gradient(var(--color-accent)_50%,transparent_0)]',
        status === 'TODO' && 'border-border-strong',
        status === 'CANCELLED' && 'border-dashed border-border-strong',
      )}
    />
  );
}

/** One task, read-only. `detail` is the secondary line (e.g. project name). */
export function TaskRow({
  task,
  overdue = false,
  detail,
}: {
  task: TaskResponse;
  overdue?: boolean;
  detail?: string;
}) {
  const priority = PRIORITY_BADGE[task.priority];
  const closed = task.status === 'COMPLETED' || task.status === 'CANCELLED';

  return (
    <li className="flex items-center gap-3 px-3 py-2.5">
      <StatusMark status={task.status} />
      <div className="min-w-0 flex-1">
        <p
          className={cn(
            'truncate text-[13px] font-medium',
            closed ? 'text-fg-muted' : 'text-fg',
            task.status === 'CANCELLED' && 'line-through',
          )}
        >
          {task.title}
        </p>
        <p className="truncate text-xs text-fg-subtle">
          {STATUS_LABEL[task.status]}
          {detail && ` · ${detail}`}
        </p>
      </div>
      {!closed && (
        <div className="flex shrink-0 items-center gap-1.5">
          {priority && <Badge tone={priority.tone}>{priority.label}</Badge>}
          {task.dueAt &&
            (overdue ? (
              <Badge tone="danger" dot>
                Overdue
              </Badge>
            ) : (
              <span className="hidden items-center gap-1 text-xs text-fg-muted tabular-nums sm:inline-flex">
                <ClockIcon width={13} height={13} className="text-fg-subtle" />
                <span className="sr-only">Due</span>
                <LocalDate value={task.dueAt} />
              </span>
            ))}
        </div>
      )}
      {task.status === 'COMPLETED' && task.completedAt && (
        <span className="hidden shrink-0 text-xs text-fg-subtle tabular-nums sm:inline">
          <span className="sr-only">Completed </span>
          <LocalDate value={task.completedAt} />
        </span>
      )}
    </li>
  );
}
