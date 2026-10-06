'use client';

import type { TaskResponse, TaskStatus } from '@nexus/types';
import { cn } from '@nexus/ui';
import { useOptimistic, useState, useTransition } from 'react';
import { patchTaskAction } from '@/lib/tasks/actions';
import { StatusMark } from './status-mark';

/**
 * One-click complete / reopen. Shows the new state immediately and rolls
 * back (with a message) if the API rejects it. Cancelled tasks are changed
 * from the task page, not here.
 */
export function TaskStatusToggle({
  task,
  className,
}: {
  task: Pick<TaskResponse, 'id' | 'title' | 'status'>;
  className?: string;
}) {
  const [status, setOptimisticStatus] = useOptimistic(task.status);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (status === 'CANCELLED') {
    return (
      <span
        className={cn('flex size-5 items-center justify-center', className)}
      >
        <StatusMark status={status} />
      </span>
    );
  }

  const completed = status === 'COMPLETED';
  const next: TaskStatus = completed ? 'TODO' : 'COMPLETED';

  return (
    <span className={cn('relative', className)}>
      <button
        type="button"
        aria-label={`${completed ? 'Reopen' : 'Complete'} task: ${task.title}`}
        aria-pressed={completed}
        disabled={pending}
        onClick={() => {
          setError(null);
          startTransition(async () => {
            setOptimisticStatus(next);
            const result = await patchTaskAction(task.id, { status: next });
            if (result.error) setError(result.error);
          });
        }}
        className="flex size-5 items-center justify-center rounded-full transition-transform hover:scale-110 disabled:opacity-60 [&>span]:transition-colors"
      >
        <StatusMark status={status} />
      </button>
      {error && (
        <span role="alert" className="sr-only">
          Couldn’t update {task.title}: {error}
        </span>
      )}
    </span>
  );
}
