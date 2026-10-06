'use client';

import type { GoalResponse, GoalStatus } from '@nexus/types';
import { Alert, Button, Dialog, Spinner } from '@nexus/ui';
import { useCallback, useState, useTransition } from 'react';
import { AlertIcon } from '@/components/icons';
import {
  deleteGoalAction,
  setGoalStatusAction,
  updateGoalAction,
} from '@/lib/goals/actions';
import { GoalForm } from './goal-form';

type Panel = 'edit' | 'delete' | null;

/** The natural next step for each status. Others are in the status picker. */
const NEXT_STEP: Record<GoalStatus, { label: string; status: GoalStatus }> = {
  ACTIVE: { label: 'Mark achieved', status: 'COMPLETED' },
  PAUSED: { label: 'Resume', status: 'ACTIVE' },
  COMPLETED: { label: 'Reopen', status: 'ACTIVE' },
  ARCHIVED: { label: 'Restore', status: 'ACTIVE' },
};

/** Edit, next status step and delete for one goal. */
export function GoalActions({ goal }: { goal: GoalResponse }) {
  const [panel, setPanel] = useState<Panel>(null);
  const [session, setSession] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [statusPending, startStatus] = useTransition();
  const [deletePending, startDelete] = useTransition();

  const close = useCallback(() => setPanel(null), []);
  const open = (next: Panel) => {
    setError(null);
    setSession((value) => value + 1);
    setPanel(next);
  };
  const step = NEXT_STEP[goal.status];

  return (
    <div className="flex flex-col items-start gap-2 sm:items-end">
      <div className="flex flex-wrap gap-2">
        <Button
          variant={goal.status === 'ACTIVE' ? 'primary' : 'secondary'}
          size="sm"
          disabled={statusPending}
          onClick={() => {
            setError(null);
            startStatus(async () => {
              const result = await setGoalStatusAction(goal.id, step.status);
              if (result.error) setError(result.error);
            });
          }}
        >
          {statusPending && <Spinner />}
          {step.label}
        </Button>
        <Button variant="secondary" size="sm" onClick={() => open('edit')}>
          Edit
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="text-danger hover:bg-danger-soft hover:text-danger"
          onClick={() => open('delete')}
        >
          Delete
        </Button>
      </div>
      {error && panel === null && (
        <p
          role="alert"
          className="flex items-center gap-1.5 text-xs text-danger"
        >
          <AlertIcon width={14} height={14} />
          {error}
        </p>
      )}

      <Dialog
        open={panel === 'edit'}
        onClose={close}
        title="Edit goal"
        size="lg"
      >
        {panel === 'edit' && (
          <GoalForm
            key={session}
            action={updateGoalAction.bind(null, goal.id)}
            initial={{
              title: goal.title,
              description: goal.description ?? '',
              status: goal.status,
              targetDate: goal.targetDate ?? '',
            }}
            submitLabel="Save changes"
            pendingLabel="Saving…"
            onSaved={close}
            onCancel={close}
          />
        )}
      </Dialog>

      <Dialog
        open={panel === 'delete'}
        onClose={close}
        title="Delete this goal?"
      >
        <div className="grid gap-3 px-5 pt-2 pb-5 text-[13px] leading-5 text-fg-muted">
          <p>
            <span className="font-medium break-words text-fg">
              {goal.title}
            </span>{' '}
            will be permanently deleted. This can’t be undone.
          </p>
          <ul className="list-disc space-y-1 pl-5">
            <li>Your projects and tasks aren’t affected.</li>
            <li>Linked documents are kept; only the links are removed.</li>
            <li>Its context relationships are removed.</li>
          </ul>
          {goal.status !== 'ARCHIVED' && (
            <p>To keep it for reference instead, set its status to Archived.</p>
          )}
          {error && <Alert icon={<AlertIcon />}>{error}</Alert>}
        </div>
        <div className="flex flex-col-reverse gap-2 border-t border-border px-5 py-4 sm:flex-row sm:justify-end">
          <Button variant="secondary" onClick={close} disabled={deletePending}>
            Cancel
          </Button>
          <Button
            variant="danger"
            disabled={deletePending}
            onClick={() => {
              setError(null);
              startDelete(async () => {
                // Navigates to /goals on success; only failures come back.
                const result = await deleteGoalAction(goal.id);
                if (result?.error) setError(result.error);
              });
            }}
          >
            {deletePending && <Spinner />}
            {deletePending ? 'Deleting…' : 'Delete goal'}
          </Button>
        </div>
      </Dialog>
    </div>
  );
}
