'use client';

import type { ProjectStatus } from '@nexus/types';
import {
  Alert,
  Button,
  SelectField,
  Spinner,
  TextAreaField,
  TextField,
} from '@nexus/ui';
import { useActionState, useRef, useState } from 'react';
import { useFormFeedback } from '@/components/forms/use-form-feedback';
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

const FIELD_ORDER: (keyof ProjectFieldErrors)[] = [
  'name',
  'description',
  'status',
];

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
  const formRef = useRef<HTMLFormElement>(null);
  const { errors, report, clearError } = useFormFeedback({
    state,
    fieldOrder: FIELD_ORDER,
    formRef,
    onSaved,
  });
  const [descriptionLength, setDescriptionLength] = useState(
    initial.description.length,
  );

  return (
    <form
      ref={formRef}
      action={formAction}
      noValidate
      onSubmit={(event) => {
        const result = validateProject(
          readProjectForm(new FormData(event.currentTarget)),
        );
        if (!report(result.errors)) event.preventDefault();
      }}
      className="flex flex-col"
    >
      <div className="grid gap-4 px-5 pt-4 pb-5">
        {state.error && <Alert icon={<AlertIcon />}>{state.error}</Alert>}
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
