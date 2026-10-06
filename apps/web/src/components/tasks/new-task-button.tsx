'use client';

import { Button, Dialog, type ButtonProps } from '@nexus/ui';
import { useCallback, useState } from 'react';
import { PlusIcon } from '@/components/icons';
import { createTaskAction } from '@/lib/tasks/actions';
import type { ProjectOption } from '@/lib/tasks/project-options';
import { EMPTY_TASK, TaskForm } from './task-form';

/** "New task" trigger + dialog. The current page refreshes on success. */
export function NewTaskButton({
  projects,
  defaultProjectId = null,
  variant = 'primary',
  size,
}: {
  projects: ProjectOption[];
  /** Pre-selects a project (e.g. when adding from a project page). */
  defaultProjectId?: string | null;
  variant?: ButtonProps['variant'];
  size?: ButtonProps['size'];
}) {
  const [open, setOpen] = useState(false);
  const [session, setSession] = useState(0);
  const [announcement, setAnnouncement] = useState('');

  const close = useCallback(() => setOpen(false), []);
  const saved = useCallback(() => {
    setOpen(false);
    setAnnouncement('Task created.');
  }, []);

  return (
    <>
      <Button
        variant={variant}
        size={size}
        aria-haspopup="dialog"
        onClick={() => {
          setSession((value) => value + 1);
          setAnnouncement('');
          setOpen(true);
        }}
      >
        <PlusIcon />
        New task
      </Button>
      <Dialog open={open} onClose={close} title="New task" size="lg">
        {open && (
          <TaskForm
            key={session}
            action={createTaskAction}
            initial={{ ...EMPTY_TASK, projectId: defaultProjectId }}
            projects={projects}
            submitLabel="Create task"
            pendingLabel="Creating…"
            onSaved={saved}
            onCancel={close}
          />
        )}
      </Dialog>
      <p role="status" className="sr-only">
        {announcement}
      </p>
    </>
  );
}
