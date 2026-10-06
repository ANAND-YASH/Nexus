/** What every create/edit Server Action returns to its form. */
export interface FormActionState<Field extends string> {
  /** Increments on each success so the form can react (close, reset). */
  savedCount?: number;
  /** Id of the record last saved. */
  savedId?: string;
  error?: string;
  fieldErrors?: Partial<Record<Field, string>>;
}

/** The state after a successful save. */
export function savedState<Field extends string>(
  state: FormActionState<Field>,
  id: string,
): FormActionState<Field> {
  return { savedCount: (state.savedCount ?? 0) + 1, savedId: id };
}
