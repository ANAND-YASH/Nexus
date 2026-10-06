'use client';

import type { ProjectStatus } from '@nexus/types';
import {
  Button,
  SelectField,
  Spinner,
  TextAreaField,
  TextField,
} from '@nexus/ui';
import { useActionState, useEffect, useRef, useState } from 'react';
import { AlertIcon } from '@/components/icons';
import type { ProjectFormState } from '@/lib/projects/actions';
import {
  PROJECT_DESCRIPTION_MAX,
  PROJECT_NAME_MAX,
  PROJECT_STATUS_OPTIONS,
  readProjectForm,
  validateProject,
  type ProjectFieldErrors,
} from '@/lib/projects/validation';

export interface ProjectFormValues {
  name: string;
  description: string;
  status: ProjectStatus;
}

const EMPTY: ProjectFormValues = {
  name: '',
  description: '',
  status: 'ACTIVE',
};

/**
 * Create/edit form. Validates on submit for instant feedback; the Server
 * Action validates again and reports API errors.
 */
export function ProjectForm({
  action,
  initial = EMPTY,
  submitLabel,
  pendingLabel,
  onSaved,
  onCancel,
}: {
  action: (
    state: ProjectFormState,
    formData: FormData,
  ) => Promise<ProjectFormState>;
  initial?: ProjectFormValues;
  submitLabel: string;
  pendingLabel: string;
  onSaved: (projectId: string) => void;
  onCancel: () => void;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  const [clientErrors, setClientErrors] = useState<ProjectFieldErrors>({});
  const [descriptionLength, setDescriptionLength] = useState(
    initial.description.length,
  );
  const lastSaved = useRef(state.savedCount ?? 0);

  // Each success bumps `savedCount`; react once per save.
  useEffect(() => {
    const saved = state.savedCount ?? 0;
    if (saved > lastSaved.current && state.projectId) {
      lastSaved.current = saved;
      onSaved(state.projectId);
    }
  }, [state.savedCount, state.projectId, onSaved]);

  const errors = { ...state.fieldErrors, ...clientErrors };
  const clearError = (field: keyof ProjectFieldErrors) =>
    setClientErrors((current) => {
      if (!current[field]) return current;
      const next = { ...current };
      delete next[field];
      return next;
    });

  return (
    <form
      action={formAction}
      noValidate
      onSubmit={(event) => {
        const result = validateProject(
          readProjectForm(new FormData(event.currentTarget)),
        );
        if (result.errors) {
          event.preventDefault();
          setClientErrors(result.errors);
          // Move focus to the first invalid field.
          const first = Object.keys(result.errors)[0];
          event.currentTarget
            .querySelector<HTMLElement>(`[name="${first}"]`)
            ?.focus();
        } else {
          setClientErrors({});
        }
      }}
      className="flex flex-col"
    >
      <div className="grid gap-4 px-5 pt-4 pb-5">
        {state.error && (
          <div
            role="alert"
            className="flex gap-2.5 rounded-lg bg-danger-soft px-3 py-2.5 text-[13px] text-danger ring-1 ring-danger/15 ring-inset"
          >
            <AlertIcon width={16} height={16} className="mt-px shrink-0" />
            <p>{state.error}</p>
          </div>
        )}
        <TextField
          id="project-name"
          name="name"
          label="Name"
          defaultValue={initial.name}
          maxLength={PROJECT_NAME_MAX}
          autoComplete="off"
          required
          autoFocus
          error={errors.name}
          onInput={() => clearError('name')}
        />
        <TextAreaField
          id="project-description"
          name="description"
          label="Description"
          labelAside={
            descriptionLength > PROJECT_DESCRIPTION_MAX * 0.9
              ? `${descriptionLength.toLocaleString()} / ${PROJECT_DESCRIPTION_MAX.toLocaleString()}`
              : 'Optional'
          }
          rows={4}
          defaultValue={initial.description}
          placeholder="What is this project about?"
          error={errors.description}
          onInput={(event) => {
            setDescriptionLength(event.currentTarget.value.length);
            clearError('description');
          }}
        />
        <SelectField
          id="project-status"
          name="status"
          label="Status"
          defaultValue={initial.status}
          options={PROJECT_STATUS_OPTIONS}
          error={errors.status}
        />
      </div>
      <div className="flex flex-col-reverse gap-2 border-t border-border px-5 py-4 sm:flex-row sm:justify-end">
        <Button variant="secondary" onClick={onCancel} disabled={pending}>
          Cancel
        </Button>
        <Button type="submit" disabled={pending}>
          {pending && <Spinner />}
          {pending ? pendingLabel : submitLabel}
        </Button>
      </div>
    </form>
  );
}
