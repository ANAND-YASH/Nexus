'use client';

import { Button, Dialog, type ButtonProps } from '@nexus/ui';
import { useCallback, useState } from 'react';
import { PlusIcon } from '@/components/icons';
import { createGoalAction } from '@/lib/goals/actions';
import { GoalForm } from './goal-form';

/** "New goal" trigger + dialog. The current page refreshes on success. */
export function NewGoalButton({
  variant = 'primary',
}: {
  variant?: ButtonProps['variant'];
}) {
  const [open, setOpen] = useState(false);
  const [session, setSession] = useState(0);
  const [announcement, setAnnouncement] = useState('');

  const close = useCallback(() => setOpen(false), []);
  const saved = useCallback(() => {
    setOpen(false);
    setAnnouncement('Goal created.');
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
        New goal
      </Button>
      <Dialog open={open} onClose={close} title="New goal" size="lg">
        {open && (
          <GoalForm
            key={session}
            action={createGoalAction}
            submitLabel="Create goal"
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
