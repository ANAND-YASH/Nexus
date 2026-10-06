'use client';

import type { TaskPriority, TaskResponse, TaskStatus } from '@nexus/types';
import { SelectField, Spinner } from '@nexus/ui';
import { useOptimistic, useState, useTransition } from 'react';
import { patchTaskAction } from '@/lib/tasks/actions';
import { TASK_PRIORITY_OPTIONS, TASK_STATUS_OPTIONS } from '@/lib/tasks/meta';

/**
 * Status and priority, editable in place: each change is saved at once
 * with PATCH, and reverted with a message if the API rejects it.
 */
export function TaskQuickFields({ task }: { task: TaskResponse }) {
  const [values, setOptimistic] = useOptimistic({
    status: task.status,
    priority: task.priority,
  });
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState('');
  const [error, setError] = useState<string | null>(null);

  function save(patch: { status?: TaskStatus; priority?: TaskPriority }) {
    setError(null);
    setMessage('');
    startTransition(async () => {
      setOptimistic((current) => ({ ...current, ...patch }));
      const result = await patchTaskAction(task.id, patch);
      if (result.error) setError(result.error);
      else setMessage('Saved.');
    });
  }

  return (
    <div className="grid gap-4">
      <SelectField
        id="quick-status"
        label="Status"
        value={values.status}
        options={TASK_STATUS_OPTIONS}
        disabled={pending}
        onChange={(event) => save({ status: event.target.value as TaskStatus })}
      />
      <SelectField
        id="quick-priority"
        label="Priority"
        value={values.priority}
        options={TASK_PRIORITY_OPTIONS}
        disabled={pending}
        onChange={(event) =>
          save({ priority: event.target.value as TaskPriority })
        }
      />
      <p role="status" className="flex min-h-4 items-center gap-1.5 text-xs">
        {pending ? (
          <>
            <Spinner className="size-3" />
            <span className="text-fg-muted">Saving…</span>
          </>
        ) : error ? (
          <span className="text-danger">{error}</span>
        ) : (
          <span className="text-fg-subtle">{message}</span>
        )}
      </p>
    </div>
  );
}
