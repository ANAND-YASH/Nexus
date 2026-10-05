import type {
  ContextDocumentNode,
  ContextEntityNode,
  ContextGoalNode,
  ContextProjectNode,
  ContextTaskNode,
} from '@nexus/types';
import type { Document } from '../../documents/document.entity';
import type { Goal } from '../../goals/goal.entity';
import type { Project } from '../../projects/project.entity';
import type { Task } from '../../tasks/task.entity';
import type { ContextEntity } from '../entities/context-entity.entity';

const iso = (d: Date) => d.toISOString();

/** Metadata only — document content is never loaded for graph views. */
export const toDocumentNode = (d: Document): ContextDocumentNode => ({
  id: d.id,
  title: d.title,
  mimeType: d.mimeType,
  sourceType: d.sourceType,
  createdAt: iso(d.createdAt),
  updatedAt: iso(d.updatedAt),
});

export const toProjectNode = (p: Project): ContextProjectNode => ({
  id: p.id,
  name: p.name,
  status: p.status,
  createdAt: iso(p.createdAt),
  updatedAt: iso(p.updatedAt),
});

export const toTaskNode = (t: Task): ContextTaskNode => ({
  id: t.id,
  projectId: t.projectId,
  title: t.title,
  status: t.status,
  priority: t.priority,
  dueAt: t.dueAt ? iso(t.dueAt) : null,
  createdAt: iso(t.createdAt),
  updatedAt: iso(t.updatedAt),
});

export const toGoalNode = (g: Goal): ContextGoalNode => ({
  id: g.id,
  title: g.title,
  status: g.status,
  targetDate: g.targetDate,
  createdAt: iso(g.createdAt),
  updatedAt: iso(g.updatedAt),
});

export const toEntityNode = (e: ContextEntity): ContextEntityNode => ({
  id: e.id,
  name: e.name,
  type: e.type,
  createdAt: iso(e.createdAt),
  updatedAt: iso(e.updatedAt),
});
