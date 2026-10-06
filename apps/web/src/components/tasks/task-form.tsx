'use client';

import type { TaskPriority, TaskStatus } from '@nexus/types';
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
import type { TaskFormState } from '@/lib/tasks/actions';
import type { ProjectOption } from '@/lib/tasks/project-options';
import { fromDueAt, toDueAt } from '@/lib/tasks/due';
import { TASK_PRIORITY_OPTIONS, TASK_STATUS_OPTIONS } from '@/lib/tasks/meta';
import {
  readTaskForm,
  TASK_DESCRIPTION_MAX,
  TASK_TITLE_MAX,
  validateTask,
  type TaskFieldErrors,
} from '@/lib/tasks/validation';

export interface TaskFormValues {
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueAt: string | null;
  projectId: string | null;
}

export const EMPTY_TASK: TaskFormValues = {
  title: '',
  description: '',
  status: 'TODO',
  priority: 'MEDIUM',
  dueAt: null,
  projectId: null,
};

/** Field order, for focusing the first invalid one. */
const FIELD_ORDER: (keyof TaskFieldErrors)[] = [
  'title',
  'description',
  'status',
  'priority',
  'dueDate',
  'projectId',
];

function projectChoices(projects: ProjectOption[], currentId: string | null) {
  const usable = projects.filter(
    (p) => p.status !== 'ARCHIVED' || p.id === currentId,
  );
  return [
    { value: '', label: 'No project' },
    ...usable.map((p) => ({
      value: p.id,
      label: p.status === 'ARCHIVED' ? `${p.name} (archived)` : p.name,
    })),
  ];
}

/**
 * Create/edit form for a task. Validates on submit for instant feedback;
 * the Server Action validates again and reports API errors.
 */
export function TaskForm({
  action,
  initial = EMPTY_TASK,
  projects,
  submitLabel,
  pendingLabel,
  onSaved,
  onCancel,
}: {
  action: (state: TaskFormState, formData: FormData) => Promise<TaskFormState>;
  initial?: TaskFormValues;
  projects: ProjectOption[];
  submitLabel: string;
  pendingLabel: string;
  onSaved: (taskId: string) => void;
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
  const [due] = useState(() => fromDueAt(initial.dueAt));
  const dueAtRef = useRef<HTMLInputElement>(null);

  return (
    <form
      ref={formRef}
      action={formAction}
      noValidate
      onSubmit={(event) => {
        const form = event.currentTarget;
        const data = new FormData(form);
        // Local date + time → an absolute timestamp, in the viewer's zone.
        const dueAt =
          toDueAt(String(data.get('dueDate')), String(data.get('dueTime'))) ??
          '';
        if (dueAtRef.current) dueAtRef.current.value = dueAt;
        data.set('dueAt', dueAt);

        if (!report(validateTask(readTaskForm(data)).errors)) {
          event.preventDefault();
        }
      }}
      className="flex flex-col"
    >
      <input ref={dueAtRef} type="hidden" name="dueAt" defaultValue="" />
      <div className="grid gap-4 px-5 pt-4 pb-5">
        {state.error && <Alert icon={<AlertIcon />}>{state.error}</Alert>}
        <TextField
          id="task-title"
          name="title"
          label="Title"
          defaultValue={initial.title}
          maxLength={TASK_TITLE_MAX}
          autoComplete="off"
          required
          error={errors.title}
          onInput={() => clearError('title')}
        />
        <TextAreaField
          id="task-description"
          name="description"
          label="Description"
          labelAside="Optional"
          rows={3}
          maxLength={TASK_DESCRIPTION_MAX}
          defaultValue={initial.description}
          placeholder="Notes, links or acceptance criteria"
          error={errors.description}
          onInput={() => clearError('description')}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <SelectField
            id="task-status"
            name="status"
            label="Status"
            defaultValue={initial.status}
            options={TASK_STATUS_OPTIONS}
            error={errors.status}
          />
          <SelectField
            id="task-priority"
            name="priority"
            label="Priority"
            defaultValue={initial.priority}
            options={TASK_PRIORITY_OPTIONS}
            error={errors.priority}
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            id="task-due-date"
            name="dueDate"
            type="date"
            label="Due date"
            labelAside="Optional"
            defaultValue={due.date}
            error={errors.dueDate}
            onInput={() => clearError('dueDate')}
          />
          <TextField
            id="task-due-time"
            name="dueTime"
            type="time"
            label="Time"
            labelAside="Optional"
            defaultValue={due.time}
            hint="Without a time, it’s due by the end of the day."
          />
        </div>
        <SelectField
          id="task-project"
          name="projectId"
          label="Project"
          defaultValue={initial.projectId ?? ''}
          options={projectChoices(projects, initial.projectId)}
          error={errors.projectId}
          onChange={() => clearError('projectId')}
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
