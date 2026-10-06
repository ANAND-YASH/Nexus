'use client';

import { useEffect, useRef, useState, type RefObject } from 'react';
import type { FormActionState } from '@/lib/forms';

function focusField(form: HTMLFormElement | null, field: string) {
  form?.querySelector<HTMLElement>(`[name="${field}"]`)?.focus();
}

/**
 * Shared feedback for the entity forms: merges client and server field
 * errors, moves focus to the first invalid field (fields are named after
 * their error keys), and calls `onSaved` once per successful save.
 */
export function useFormFeedback<Field extends string>({
  state,
  fieldOrder,
  formRef,
  onSaved,
}: {
  state: FormActionState<Field>;
  /** Visual order of the fields, for choosing which to focus. */
  fieldOrder: readonly Field[];
  formRef: RefObject<HTMLFormElement | null>;
  onSaved: (id: string) => void;
}) {
  const [clientErrors, setClientErrors] = useState<
    Partial<Record<Field, string>>
  >({});
  const lastSaved = useRef(state.savedCount ?? 0);

  useEffect(() => {
    const saved = state.savedCount ?? 0;
    if (saved > lastSaved.current && state.savedId) {
      lastSaved.current = saved;
      onSaved(state.savedId);
    }
  }, [state.savedCount, state.savedId, onSaved]);

  // Server errors arrive after a round trip: focus the first one then.
  useEffect(() => {
    const first = fieldOrder.find((field) => state.fieldErrors?.[field]);
    if (first) focusField(formRef.current, first);
  }, [state.fieldErrors, fieldOrder, formRef]);

  return {
    errors: { ...state.fieldErrors, ...clientErrors },

    /** Shows client-side errors; returns false (and focuses) if any. */
    report(errors: Partial<Record<Field, string>> | undefined): boolean {
      setClientErrors(errors ?? {});
      const first = errors && fieldOrder.find((field) => errors[field]);
      if (first) focusField(formRef.current, first);
      return !first;
    },

    clearError(field: Field) {
      setClientErrors((current) => {
        if (!current[field]) return current;
        const next = { ...current };
        delete next[field];
        return next;
      });
    },
  };
}
