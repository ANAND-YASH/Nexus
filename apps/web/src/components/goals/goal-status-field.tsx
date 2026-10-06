'use client';

import type { GoalResponse, GoalStatus } from '@nexus/types';
import { SelectField, Spinner } from '@nexus/ui';
import { useOptimistic, useState, useTransition } from 'react';
import { setGoalStatusAction } from '@/lib/goals/actions';
import { GOAL_STATUS_META, GOAL_STATUS_OPTIONS } from '@/lib/goals/meta';

/** Status, editable in place: saved at once, reverted if the API refuses. */
export function GoalStatusField({ goal }: { goal: GoalResponse }) {
  const [status, setOptimistic] = useOptimistic(goal.status);
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState('');
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="grid gap-1.5">
      <SelectField
        id="goal-quick-status"
        label="Status"
        value={status}
        options={GOAL_STATUS_OPTIONS}
        disabled={pending}
        hint={GOAL_STATUS_META[status].description}
        onChange={(event) => {
          const next = event.target.value as GoalStatus;
          setError(null);
          setMessage('');
          startTransition(async () => {
            setOptimistic(next);
            const result = await setGoalStatusAction(goal.id, next);
            if (result.error) setError(result.error);
            else setMessage('Saved.');
          });
        }}
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
