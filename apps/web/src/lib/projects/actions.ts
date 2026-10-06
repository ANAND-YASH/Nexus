'use server';

import type { ProjectStatus } from '@nexus/types';
import { refresh } from 'next/cache';
import { redirect } from 'next/navigation';
import { describeFailure } from '../actions/failure';
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

const NOT_FOUND = 'This project no longer exists. It may have been deleted.';

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
    return {
      ...state,
      error: describeFailure(error, NOT_FOUND),
      fieldErrors: undefined,
    };
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
    return {
      ...state,
      error: describeFailure(error, NOT_FOUND),
      fieldErrors: undefined,
    };
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
    return { error: describeFailure(error, NOT_FOUND) };
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
    return { error: describeFailure(error, NOT_FOUND) };
  }
  redirect('/projects');
}
