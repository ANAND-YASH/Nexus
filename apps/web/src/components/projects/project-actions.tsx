'use client';

import type { ProjectResponse } from '@nexus/types';
import { Button, Dialog, Spinner } from '@nexus/ui';
import { useCallback, useState, useTransition } from 'react';
import { AlertIcon } from '@/components/icons';
import {
  deleteProjectAction,
  setProjectStatusAction,
  updateProjectAction,
} from '@/lib/projects/actions';
import { ProjectForm } from './project-form';

type Panel = 'edit' | 'delete' | null;

/** Edit, archive/restore and delete for one project. */
export function ProjectActions({ project }: { project: ProjectResponse }) {
  const [panel, setPanel] = useState<Panel>(null);
  const [session, setSession] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [statusPending, startStatus] = useTransition();
  const [deletePending, startDelete] = useTransition();

  const close = useCallback(() => setPanel(null), []);
  const archived = project.status === 'ARCHIVED';

  function open(next: Panel) {
    setError(null);
    setSession((value) => value + 1);
    setPanel(next);
  }

  function toggleArchive() {
    setError(null);
    startStatus(async () => {
      const result = await setProjectStatusAction(
        project.id,
        archived ? 'ACTIVE' : 'ARCHIVED',
      );
      if (result.error) setError(result.error);
    });
  }

  function confirmDelete() {
    setError(null);
    startDelete(async () => {
      // Navigates away on success; only failures come back.
      const result = await deleteProjectAction(project.id);
      if (result?.error) setError(result.error);
    });
  }

  return (
    <div className="flex flex-col items-start gap-2 sm:items-end">
      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" size="sm" onClick={() => open('edit')}>
          Edit
        </Button>
        <Button
          variant="secondary"
          size="sm"
          onClick={toggleArchive}
          disabled={statusPending}
        >
          {statusPending && <Spinner />}
          {archived ? 'Restore' : 'Archive'}
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

      <Dialog open={panel === 'edit'} onClose={close} title="Edit project">
        {panel === 'edit' && (
          <ProjectForm
            key={session}
            action={updateProjectAction.bind(null, project.id)}
            initial={{
              name: project.name,
              description: project.description ?? '',
              status: project.status,
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
        title="Delete this project?"
      >
        <div className="grid gap-3 px-5 pt-2 pb-5 text-[13px] leading-5 text-fg-muted">
          <p>
            <span className="font-medium text-fg">{project.name}</span> will be
            permanently deleted. This can’t be undone.
          </p>
          <ul className="list-disc space-y-1 pl-5">
            <li>Its tasks are kept, but no longer belong to a project.</li>
            <li>Linked documents are kept; only the links are removed.</li>
            <li>Its context relationships are removed.</li>
          </ul>
          {!archived && (
            <p>Want to keep it out of the way instead? Archive it.</p>
          )}
          {error && (
            <p
              role="alert"
              className="flex items-center gap-1.5 font-medium text-danger"
            >
              <AlertIcon width={14} height={14} />
              {error}
            </p>
          )}
        </div>
        <div className="flex flex-col-reverse gap-2 border-t border-border px-5 py-4 sm:flex-row sm:justify-end">
          <Button
            variant="secondary"
            onClick={close}
            disabled={deletePending}
            autoFocus
          >
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={confirmDelete}
            disabled={deletePending}
          >
            {deletePending && <Spinner />}
            {deletePending ? 'Deleting…' : 'Delete project'}
          </Button>
        </div>
      </Dialog>
    </div>
  );
}
