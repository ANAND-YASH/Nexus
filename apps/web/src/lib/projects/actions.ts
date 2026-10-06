'use server';

import type { ProjectStatus } from '@nexus/types';
import { refresh } from 'next/cache';
import { redirect, unstable_rethrow } from 'next/navigation';
import { ApiError } from '../api/client';
import { createProject, deleteProject, updateProject } from '../api/projects';
import {
  readProjectForm,
  validateProject,
  type ProjectFieldErrors,
} from './validation';

export interface ProjectFormState {
  /** Increments on each success so the form can react (close, reset). */
  savedCount?: number;
  /** Id of the project last saved. */
  projectId?: string;
  error?: string;
  fieldErrors?: ProjectFieldErrors;
}

export interface ProjectActionResult {
  error?: string;
}

/** Maps a failure to a message. Next.js control flow (redirects) passes through. */
function describeFailure(error: unknown): string {
  unstable_rethrow(error);
  if (!(error instanceof ApiError) || error.unreachable) {
    return "We couldn't reach NEXUS. Check your connection and try again.";
  }
  if (error.status === 404) {
    return 'This project no longer exists. It may have been deleted.';
  }
  // Validation messages from the API are written for people.
  if (error.status === 400) return error.message;
  return 'Something went wrong on our side. Please try again.';
}

export async function createProjectAction(
  state: ProjectFormState,
  formData: FormData,
): Promise<ProjectFormState> {
  const result = validateProject(readProjectForm(formData));
  if (result.errors)
    return { ...state, error: undefined, fieldErrors: result.errors };

  try {
    const project = await createProject(result.input);
    refresh();
    return { savedCount: (state.savedCount ?? 0) + 1, projectId: project.id };
  } catch (error) {
    return { ...state, error: describeFailure(error), fieldErrors: undefined };
  }
}

export async function updateProjectAction(
  id: string,
  state: ProjectFormState,
  formData: FormData,
): Promise<ProjectFormState> {
  const result = validateProject(readProjectForm(formData));
  if (result.errors)
    return { ...state, error: undefined, fieldErrors: result.errors };

  try {
    await updateProject(id, result.input);
    refresh();
    return { savedCount: (state.savedCount ?? 0) + 1, projectId: id };
  } catch (error) {
    return { ...state, error: describeFailure(error), fieldErrors: undefined };
  }
}

/** Archive, restore or complete without opening the editor. */
export async function setProjectStatusAction(
  id: string,
  status: ProjectStatus,
): Promise<ProjectActionResult> {
  try {
    await updateProject(id, { status });
  } catch (error) {
    return { error: describeFailure(error) };
  }
  refresh();
  return {};
}

export async function deleteProjectAction(
  id: string,
): Promise<ProjectActionResult> {
  try {
    await deleteProject(id);
  } catch (error) {
    return { error: describeFailure(error) };
  }
  redirect('/projects');
}
