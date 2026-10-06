'use client';

import { Button, Dialog, type ButtonProps } from '@nexus/ui';
import { useCallback, useState } from 'react';
import { createProjectAction } from '@/lib/projects/actions';
import { ProjectForm } from './project-form';

function PlusIcon() {
  return (
    <svg aria-hidden viewBox="0 0 16 16" fill="none">
      <path
        d="M8 3.5v9M3.5 8h9"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** "New project" trigger + dialog. The list refreshes in place on success. */
export function NewProjectButton({
  variant = 'primary',
}: {
  variant?: ButtonProps['variant'];
}) {
  const [open, setOpen] = useState(false);
  // A fresh form (and action state) every time the dialog opens.
  const [session, setSession] = useState(0);
  const [announcement, setAnnouncement] = useState('');

  const close = useCallback(() => setOpen(false), []);
  const saved = useCallback(() => {
    setOpen(false);
    setAnnouncement('Project created.');
  }, []);

  return (
    <>
      <Button
        variant={variant}
        aria-haspopup="dialog"
        onClick={() => {
          setSession((value) => value + 1);
          setAnnouncement('');
          setOpen(true);
        }}
      >
        <PlusIcon />
        New project
      </Button>
      <Dialog open={open} onClose={close} title="New project">
        {open && (
          <ProjectForm
            key={session}
            action={createProjectAction}
            submitLabel="Create project"
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
