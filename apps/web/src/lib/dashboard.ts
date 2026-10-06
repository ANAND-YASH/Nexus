import type {
  DocumentSummaryResponse,
  GoalResponse,
  ProjectResponse,
  TaskPriority,
  TaskResponse,
} from '@nexus/types';
import {
  taskProgress,
  tasksByProject,
  type TaskProgress,
} from './projects/progress';

/*
 * Pure derivations for the dashboard. Everything here is computed from the
 * caller's own records; nothing is estimated or invented.
 */

export function isOpenTask(task: TaskResponse): boolean {
  return task.status === 'TODO' || task.status === 'IN_PROGRESS';
}

export function isOverdue(task: TaskResponse, now = Date.now()): boolean {
  return (
    isOpenTask(task) && task.dueAt !== null && Date.parse(task.dueAt) < now
  );
}

const PRIORITY_RANK: Record<TaskPriority, number> = {
  URGENT: 0,
  HIGH: 1,
  MEDIUM: 2,
  LOW: 3,
};

export interface TaskView {
  task: TaskResponse;
  overdue: boolean;
}

/** Open tasks, soonest due first; undated tasks follow by priority. */
export function upNext(tasks: TaskResponse[], limit: number): TaskView[] {
  const now = Date.now();
  return tasks
    .filter(isOpenTask)
    .sort((a, b) => {
      if (a.dueAt && b.dueAt) return Date.parse(a.dueAt) - Date.parse(b.dueAt);
      if (a.dueAt || b.dueAt) return a.dueAt ? -1 : 1;
      return (
        PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority] ||
        Date.parse(b.createdAt) - Date.parse(a.createdAt)
      );
    })
    .slice(0, limit)
    .map((task) => ({ task, overdue: isOverdue(task, now) }));
}

export interface TaskSummary {
  open: number;
  inProgress: number;
  overdue: number;
}

export function summarizeTasks(tasks: TaskResponse[]): TaskSummary {
  const now = Date.now();
  return {
    open: tasks.filter(isOpenTask).length,
    inProgress: tasks.filter((task) => task.status === 'IN_PROGRESS').length,
    overdue: tasks.filter((task) => isOverdue(task, now)).length,
  };
}

export interface ProjectProgress {
  project: ProjectResponse;
  progress: TaskProgress;
}

/** Active projects, most recently updated first, with task progress. */
export function activeProjectProgress(
  projects: ProjectResponse[],
  tasks: TaskResponse[],
  limit: number,
): ProjectProgress[] {
  const grouped = tasksByProject(tasks);
  return projects
    .filter((project) => project.status === 'ACTIVE')
    .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt))
    .slice(0, limit)
    .map((project) => ({
      project,
      progress: taskProgress(grouped.get(project.id) ?? []),
    }));
}

/** `YYYY-MM-DD` for today in UTC, comparable with goal target dates. */
function todayUtc(): string {
  return new Date().toISOString().slice(0, 10);
}

export interface GoalView {
  goal: GoalResponse;
  pastTarget: boolean;
}

/** Active goals, nearest target date first; undated goals last. */
export function activeGoals(goals: GoalResponse[], limit: number): GoalView[] {
  const today = todayUtc();
  return goals
    .filter((goal) => goal.status === 'ACTIVE')
    .sort((a, b) => {
      if (a.targetDate && b.targetDate) {
        return a.targetDate.localeCompare(b.targetDate);
      }
      if (a.targetDate || b.targetDate) return a.targetDate ? -1 : 1;
      return Date.parse(b.createdAt) - Date.parse(a.createdAt);
    })
    .slice(0, limit)
    .map((goal) => ({
      goal,
      pastTarget: goal.targetDate !== null && goal.targetDate < today,
    }));
}

/** Newest documents first (the API already orders them this way). */
export function recentDocuments(
  documents: DocumentSummaryResponse[],
  limit: number,
): DocumentSummaryResponse[] {
  return [...documents]
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
    .slice(0, limit);
}

export function countBy<T>(items: T[], predicate: (item: T) => boolean) {
  return items.filter(predicate).length;
}
