'use client';

import type { TaskResponse } from '@nexus/types';
import { Alert, Button, Dialog, Spinner } from '@nexus/ui';
import { useCallback, useState, useTransition } from 'react';
import { AlertIcon } from '@/components/icons';
import {
  deleteTaskAction,
  patchTaskAction,
  updateTaskAction,
} from '@/lib/tasks/actions';
import { isOpenTask } from '@/lib/tasks/order';
import type { ProjectOption } from '@/lib/tasks/project-options';
import { TaskForm } from './task-form';

type Panel = 'edit' | 'delete' | null;

/** Edit, complete/reopen and delete for one task. */
export function TaskActions({
  task,
  projects,
}: {
  task: TaskResponse;
  projects: ProjectOption[];
}) {
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

  // Completing stamps completedAt on the server; reopening clears it.
  const completed = task.status === 'COMPLETED';
  const showToggle = completed || isOpenTask(task);

  return (
    <div className="flex flex-col items-start gap-2 sm:items-end">
      <div className="flex flex-wrap gap-2">
        {showToggle && (
          <Button
            variant={completed ? 'secondary' : 'primary'}
            size="sm"
            disabled={statusPending}
            onClick={() => {
              setError(null);
              startStatus(async () => {
                const result = await patchTaskAction(task.id, {
                  status: completed ? 'TODO' : 'COMPLETED',
                });
                if (result.error) setError(result.error);
              });
            }}
          >
            {statusPending && <Spinner />}
            {completed ? 'Reopen' : 'Mark complete'}
          </Button>
        )}
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
        title="Edit task"
        size="lg"
      >
        {panel === 'edit' && (
          <TaskForm
            key={session}
            action={updateTaskAction.bind(null, task.id)}
            initial={{
              title: task.title,
              description: task.description ?? '',
              status: task.status,
              priority: task.priority,
              dueAt: task.dueAt,
              projectId: task.projectId,
            }}
            projects={projects}
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
        title="Delete this task?"
      >
        <div className="grid gap-3 px-5 pt-2 pb-5 text-[13px] leading-5 text-fg-muted">
          <p>
            <span className="font-medium break-words text-fg">
              {task.title}
            </span>{' '}
            will be permanently deleted. This can’t be undone.
          </p>
          <ul className="list-disc space-y-1 pl-5">
            {task.projectId && (
              <li>It no longer counts toward its project’s progress.</li>
            )}
            <li>Linked documents are kept; only the links are removed.</li>
            <li>Its context relationships are removed.</li>
          </ul>
          {task.status !== 'CANCELLED' && (
            <p>To keep a record of it instead, set its status to Cancelled.</p>
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
                // Navigates to /tasks on success; only failures come back.
                const result = await deleteTaskAction(task.id);
                if (result?.error) setError(result.error);
              });
            }}
          >
            {deletePending && <Spinner />}
            {deletePending ? 'Deleting…' : 'Delete task'}
          </Button>
        </div>
      </Dialog>
    </div>
  );
}
