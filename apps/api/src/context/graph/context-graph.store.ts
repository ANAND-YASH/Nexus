import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type {
  ContextDocumentNode,
  ContextEntityNode,
  ContextGoalNode,
  ContextNode,
  ContextProjectNode,
  ContextResourceType,
  ContextTaskNode,
  ResourceRef,
} from '@nexus/types';
import { In, Repository } from 'typeorm';
import { Document } from '../../documents/document.entity';
import { DocumentGoalLink } from '../../documents/links/document-goal-link.entity';
import { DocumentProjectLink } from '../../documents/links/document-project-link.entity';
import { DocumentTaskLink } from '../../documents/links/document-task-link.entity';
import { Goal } from '../../goals/goal.entity';
import { Project } from '../../projects/project.entity';
import { Task } from '../../tasks/task.entity';
import { ContextEntity } from '../entities/context-entity.entity';
import {
  toDocumentNode,
  toEntityNode,
  toGoalNode,
  toProjectNode,
  toTaskNode,
} from './context-node.mapper';

export type IdsByType = Record<ContextResourceType, string[]>;

export interface NodesByType {
  DOCUMENT: ContextDocumentNode[];
  PROJECT: ContextProjectNode[];
  TASK: ContextTaskNode[];
  GOAL: ContextGoalNode[];
  ENTITY: ContextEntityNode[];
}

export const emptyIds = (): IdsByType => ({
  DOCUMENT: [],
  PROJECT: [],
  TASK: [],
  GOAL: [],
  ENTITY: [],
});

// Lightweight column sets: no document content, no descriptions/metadata.
const SELECT = {
  DOCUMENT: {
    id: true,
    title: true,
    mimeType: true,
    sourceType: true,
    createdAt: true,
    updatedAt: true,
  },
  PROJECT: {
    id: true,
    name: true,
    status: true,
    createdAt: true,
    updatedAt: true,
  },
  TASK: {
    id: true,
    projectId: true,
    title: true,
    status: true,
    priority: true,
    dueAt: true,
    createdAt: true,
    updatedAt: true,
  },
  GOAL: {
    id: true,
    title: true,
    status: true,
    targetDate: true,
    createdAt: true,
    updatedAt: true,
  },
  ENTITY: {
    id: true,
    name: true,
    type: true,
    createdAt: true,
    updatedAt: true,
  },
} as const;

const NEWEST_FIRST = { updatedAt: 'DESC', id: 'ASC' } as const;

/**
 * Read-side queries for context aggregation. Every query is owner-scoped and
 * selects metadata columns only; neighbours are loaded in one batched query
 * per resource type (no N+1).
 */
@Injectable()
export class ContextGraphStore {
  constructor(
    @InjectRepository(Document)
    private readonly documents: Repository<Document>,
    @InjectRepository(Project) private readonly projects: Repository<Project>,
    @InjectRepository(Task) private readonly tasks: Repository<Task>,
    @InjectRepository(Goal) private readonly goals: Repository<Goal>,
    @InjectRepository(ContextEntity)
    private readonly entities: Repository<ContextEntity>,
    @InjectRepository(DocumentProjectLink)
    private readonly documentProjects: Repository<DocumentProjectLink>,
    @InjectRepository(DocumentTaskLink)
    private readonly documentTasks: Repository<DocumentTaskLink>,
    @InjectRepository(DocumentGoalLink)
    private readonly documentGoals: Repository<DocumentGoalLink>,
  ) {}

  /** The resource itself, or null if missing or not the owner's. */
  async findNode(
    ownerId: string,
    ref: ResourceRef,
  ): Promise<ContextNode | null> {
    const where = { id: ref.id, ownerId };
    switch (ref.type) {
      case 'DOCUMENT': {
        const d = await this.documents.findOne({
          where,
          select: SELECT.DOCUMENT,
        });
        return d && { resourceType: 'DOCUMENT', ...toDocumentNode(d) };
      }
      case 'PROJECT': {
        const p = await this.projects.findOne({
          where,
          select: SELECT.PROJECT,
        });
        return p && { resourceType: 'PROJECT', ...toProjectNode(p) };
      }
      case 'TASK': {
        const t = await this.tasks.findOne({ where, select: SELECT.TASK });
        return t && { resourceType: 'TASK', ...toTaskNode(t) };
      }
      case 'GOAL': {
        const g = await this.goals.findOne({ where, select: SELECT.GOAL });
        return g && { resourceType: 'GOAL', ...toGoalNode(g) };
      }
      case 'ENTITY': {
        const e = await this.entities.findOne({ where, select: SELECT.ENTITY });
        return e && { resourceType: 'ENTITY', ...toEntityNode(e) };
      }
    }
  }

  /**
   * Built-in (non-graph) neighbours: Phase 5 document links and task →
   * project. At most `limit` ids per list.
   */
  async structuralNeighbors(
    ownerId: string,
    node: ContextNode,
    limit: number,
  ): Promise<IdsByType> {
    const ids = emptyIds();
    const take = limit;
    const order = { createdAt: 'DESC', id: 'ASC' } as const;
    switch (node.resourceType) {
      case 'DOCUMENT': {
        const documentId = node.id;
        const [p, t, g] = await Promise.all([
          this.documentProjects.find({
            where: { ownerId, documentId },
            select: { projectId: true },
            order,
            take,
          }),
          this.documentTasks.find({
            where: { ownerId, documentId },
            select: { taskId: true },
            order,
            take,
          }),
          this.documentGoals.find({
            where: { ownerId, documentId },
            select: { goalId: true },
            order,
            take,
          }),
        ]);
        ids.PROJECT = p.map((l) => l.projectId);
        ids.TASK = t.map((l) => l.taskId);
        ids.GOAL = g.map((l) => l.goalId);
        break;
      }
      case 'PROJECT': {
        const projectId = node.id;
        const [tasks, docs] = await Promise.all([
          this.tasks.find({
            where: { ownerId, projectId },
            select: { id: true },
            order,
            take,
          }),
          this.documentProjects.find({
            where: { ownerId, projectId },
            select: { documentId: true },
            order,
            take,
          }),
        ]);
        ids.TASK = tasks.map((t) => t.id);
        ids.DOCUMENT = docs.map((l) => l.documentId);
        break;
      }
      case 'TASK': {
        if (node.projectId) ids.PROJECT = [node.projectId];
        const docs = await this.documentTasks.find({
          where: { ownerId, taskId: node.id },
          select: { documentId: true },
          order,
          take,
        });
        ids.DOCUMENT = docs.map((l) => l.documentId);
        break;
      }
      case 'GOAL': {
        const docs = await this.documentGoals.find({
          where: { ownerId, goalId: node.id },
          select: { documentId: true },
          order,
          take,
        });
        ids.DOCUMENT = docs.map((l) => l.documentId);
        break;
      }
      case 'ENTITY':
        break;
    }
    return ids;
  }

  /** One owner-scoped query per non-empty id list. Missing ids are skipped. */
  async loadNodes(ownerId: string, ids: IdsByType): Promise<NodesByType> {
    const load = <T>(
      repo: Repository<T & { id: string }>,
      list: string[],
      select: object,
    ) =>
      list.length
        ? repo.find({
            where: { ownerId, id: In(list) } as never,
            select: select as never,
            order: NEWEST_FIRST as never,
          })
        : Promise.resolve([] as T[]);
    const [documents, projects, tasks, goals, entities] = await Promise.all([
      load<Document>(this.documents, ids.DOCUMENT, SELECT.DOCUMENT),
      load<Project>(this.projects, ids.PROJECT, SELECT.PROJECT),
      load<Task>(this.tasks, ids.TASK, SELECT.TASK),
      load<Goal>(this.goals, ids.GOAL, SELECT.GOAL),
      load<ContextEntity>(this.entities, ids.ENTITY, SELECT.ENTITY),
    ]);
    return {
      DOCUMENT: documents.map(toDocumentNode),
      PROJECT: projects.map(toProjectNode),
      TASK: tasks.map(toTaskNode),
      GOAL: goals.map(toGoalNode),
      ENTITY: entities.map(toEntityNode),
    };
  }
}
