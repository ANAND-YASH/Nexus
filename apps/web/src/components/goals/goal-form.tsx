'use client';

import type { GoalStatus } from '@nexus/types';
import {
  Alert,
  Button,
  SelectField,
  Spinner,
  TextAreaField,
  TextField,
} from '@nexus/ui';
import { useActionState, useRef } from 'react';
import { useFormFeedback } from '@/components/forms/use-form-feedback';
import { AlertIcon } from '@/components/icons';
import type { GoalFormState } from '@/lib/goals/actions';
import { GOAL_STATUS_OPTIONS } from '@/lib/goals/meta';
import {
  GOAL_DESCRIPTION_MAX,
  GOAL_TITLE_MAX,
  readGoalForm,
  validateGoal,
  type GoalField,
} from '@/lib/goals/validation';

export interface GoalFormValues {
  title: string;
  description: string;
  status: GoalStatus;
  /** `YYYY-MM-DD` or empty. */
  targetDate: string;
}

export const EMPTY_GOAL: GoalFormValues = {
  title: '',
  description: '',
  status: 'ACTIVE',
  targetDate: '',
};

const FIELD_ORDER: GoalField[] = [
  'title',
  'description',
  'status',
  'targetDate',
];

/**
 * Create/edit form for a goal. Validates on submit for instant feedback;
 * the Server Action validates again and reports API errors.
 */
export function GoalForm({
  action,
  initial = EMPTY_GOAL,
  submitLabel,
  pendingLabel,
  onSaved,
  onCancel,
}: {
  action: (state: GoalFormState, formData: FormData) => Promise<GoalFormState>;
  initial?: GoalFormValues;
  submitLabel: string;
  pendingLabel: string;
  onSaved: (goalId: string) => void;
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

  return (
    <form
      ref={formRef}
      action={formAction}
      noValidate
      onSubmit={(event) => {
        const result = validateGoal(
          readGoalForm(new FormData(event.currentTarget)),
        );
        if (!report(result.errors)) event.preventDefault();
      }}
      className="flex flex-col"
    >
      <div className="grid gap-4 px-5 pt-4 pb-5">
        {state.error && <Alert icon={<AlertIcon />}>{state.error}</Alert>}
        <TextField
          id="goal-title"
          name="title"
          label="Goal"
          placeholder="e.g. Launch NEXUS v1"
          hint="The outcome you want to reach."
          defaultValue={initial.title}
          maxLength={GOAL_TITLE_MAX}
          autoComplete="off"
          required
          error={errors.title}
          onInput={() => clearError('title')}
        />
        <TextAreaField
          id="goal-description"
          name="description"
          label="Description"
          labelAside="Optional"
          rows={4}
          maxLength={GOAL_DESCRIPTION_MAX}
          defaultValue={initial.description}
          placeholder="Why it matters, and what success looks like"
          error={errors.description}
          onInput={() => clearError('description')}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <SelectField
            id="goal-status"
            name="status"
            label="Status"
            defaultValue={initial.status}
            options={GOAL_STATUS_OPTIONS}
            error={errors.status}
          />
          <TextField
            id="goal-target-date"
            name="targetDate"
            type="date"
            label="Target date"
            labelAside="Optional"
            defaultValue={initial.targetDate}
            error={errors.targetDate}
            onInput={() => clearError('targetDate')}
          />
        </div>
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
