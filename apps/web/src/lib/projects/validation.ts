import type { ProjectStatus } from '@nexus/types';

/** Mirror the API's limits (NAME_MAX_LENGTH / DESCRIPTION_MAX_LENGTH). */
export const PROJECT_NAME_MAX = 200;
export const PROJECT_DESCRIPTION_MAX = 10_000;

export const PROJECT_STATUS_OPTIONS: ReadonlyArray<{
  value: ProjectStatus;
  label: string;
}> = [
  { value: 'ACTIVE', label: 'Active' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'ARCHIVED', label: 'Archived' },
];

export interface ProjectInput {
  name: string;
  /** `null` when left empty. */
  description: string | null;
  status: ProjectStatus;
}

export type ProjectFieldErrors = Partial<
  Record<'name' | 'description' | 'status', string>
>;

function isStatus(value: string): value is ProjectStatus {
  return PROJECT_STATUS_OPTIONS.some((option) => option.value === value);
}

/** Shared by the form (instant feedback) and the action (authoritative). */
export function validateProject(raw: {
  name: string;
  description: string;
  status: string;
}):
  { input: ProjectInput; errors?: undefined } | { errors: ProjectFieldErrors } {
  const name = raw.name.trim();
  const description = raw.description.trim();
  const errors: ProjectFieldErrors = {};

  if (!name) errors.name = 'Give the project a name.';
  else if (name.length > PROJECT_NAME_MAX) {
    errors.name = `Keep the name under ${PROJECT_NAME_MAX} characters.`;
  }
  if (description.length > PROJECT_DESCRIPTION_MAX) {
    errors.description = `Keep the description under ${PROJECT_DESCRIPTION_MAX.toLocaleString('en')} characters.`;
  }
  if (!isStatus(raw.status)) errors.status = 'Choose a status.';

  if (Object.keys(errors).length > 0) return { errors };
  return {
    input: {
      name,
      description: description || null,
      status: raw.status as ProjectStatus,
    },
  };
}

export function readProjectForm(formData: FormData) {
  return {
    name: String(formData.get('name') ?? ''),
    description: String(formData.get('description') ?? ''),
    status: String(formData.get('status') ?? ''),
  };
}
