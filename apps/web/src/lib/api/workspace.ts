import type {
  ContextEntityResponse,
  DocumentSummaryResponse,
  GoalResponse,
  ProjectResponse,
  TaskResponse,
} from '@nexus/types';
import { cache } from 'react';
import { authedGet } from './authed';

/*
 * Owner-scoped lists. `cache` dedupes them per request, so dashboard
 * sections can each ask for what they need without repeating calls.
 */

export const listProjects = cache(() =>
  authedGet<ProjectResponse[]>('/api/projects'),
);

export const listTasks = cache(() => authedGet<TaskResponse[]>('/api/tasks'));

export const listGoals = cache(() => authedGet<GoalResponse[]>('/api/goals'));

export const listDocuments = cache(() =>
  authedGet<DocumentSummaryResponse[]>('/api/documents'),
);

export const listContextEntities = cache(() =>
  authedGet<ContextEntityResponse[]>('/api/context/entities'),
);
