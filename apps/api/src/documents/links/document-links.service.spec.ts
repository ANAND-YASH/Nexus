import { NotFoundException } from '@nestjs/common';
import {
  DocumentSourceType,
  GoalStatus,
  ProjectStatus,
  TaskPriority,
  TaskStatus,
} from '@nexus/types';
import { QueryFailedError } from 'typeorm';
import type { Goal } from '../../goals/goal.entity';
import { GoalsService } from '../../goals/goals.service';
import type { Project } from '../../projects/project.entity';
import { ProjectsService } from '../../projects/projects.service';
import type { Task } from '../../tasks/task.entity';
import { TasksService } from '../../tasks/tasks.service';
import { InMemoryRepository } from '../../testing/in-memory-repository';
import type { Document } from '../document.entity';
import { DocumentsService } from '../documents.service';
import {
  ALICE,
  BOB,
  documentFields,
  InMemoryLinksStore,
} from '../testing/document-test-utils';
import { DocumentLinksService } from './document-links.service';
import type { LinkKind } from './document-links.store';

describe('DocumentLinksService', () => {
  let documents: InMemoryRepository<Document>;
  let projects: InMemoryRepository<Project>;
  let tasks: InMemoryRepository<Task>;
  let goals: InMemoryRepository<Goal>;
  let store: InMemoryLinksStore;
  let service: DocumentLinksService;

  beforeEach(() => {
    documents = new InMemoryRepository<Document>();
    projects = new InMemoryRepository<Project>();
    tasks = new InMemoryRepository<Task>();
    goals = new InMemoryRepository<Goal>();
    store = new InMemoryLinksStore();
    const projectsService = new ProjectsService(projects.asRepository());
    service = new DocumentLinksService(
      new DocumentsService(documents.asRepository(), store.asStore()),
      projectsService,
      new TasksService(tasks.asRepository(), projectsService),
      new GoalsService(goals.asRepository()),
      store.asStore(),
    );
  });

  const doc = (ownerId: string) =>
    documents.seed({
      ownerId,
      ...documentFields(),
      sourceType: DocumentSourceType.MANUAL,
    }).id;

  const target: Record<LinkKind, (ownerId: string) => string> = {
    project: (ownerId) =>
      projects.seed({
        ownerId,
        name: 'P',
        description: null,
        status: ProjectStatus.ACTIVE,
      }).id,
    task: (ownerId) =>
      tasks.seed({
        ownerId,
        projectId: null,
        title: 'T',
        description: null,
        status: TaskStatus.TODO,
        priority: TaskPriority.MEDIUM,
        dueAt: null,
        completedAt: null,
      }).id,
    goal: (ownerId) =>
      goals.seed({
        ownerId,
        title: 'G',
        description: null,
        status: GoalStatus.ACTIVE,
        targetDate: null,
      }).id,
  };

  const notFound: Record<LinkKind, string> = {
    project: 'Project not found.',
    task: 'Task not found.',
    goal: 'Goal not found.',
  };

  describe.each(['project', 'task', 'goal'] as const)('%s links', (kind) => {
    it('links an own document to an own record', async () => {
      const documentId = doc(ALICE);
      const targetId = target[kind](ALICE);

      await service.link(ALICE, documentId, kind, targetId);

      const rel = await store.relationships(ALICE, documentId);
      expect(rel[`${kind}Ids`]).toEqual([targetId]);
    });

    it('is idempotent: linking twice keeps one link', async () => {
      const documentId = doc(ALICE);
      const targetId = target[kind](ALICE);

      await service.link(ALICE, documentId, kind, targetId);
      await service.link(ALICE, documentId, kind, targetId);

      expect(store.links.size).toBe(1);
    });

    it('unlinks, and a second unlink is a 404', async () => {
      const documentId = doc(ALICE);
      const targetId = target[kind](ALICE);
      await service.link(ALICE, documentId, kind, targetId);

      await service.unlink(ALICE, documentId, kind, targetId);

      expect(store.links.size).toBe(0);
      await expect(
        service.unlink(ALICE, documentId, kind, targetId),
      ).rejects.toThrow(new NotFoundException('Link not found.'));
    });

    it(`rejects another user's ${kind} with a safe 404 and stores nothing`, async () => {
      const documentId = doc(ALICE);
      const foreign = target[kind](BOB);

      await expect(
        service.link(ALICE, documentId, kind, foreign),
      ).rejects.toThrow(new NotFoundException(notFound[kind]));
      expect(store.links.size).toBe(0);
    });

    it("rejects linking another user's document", async () => {
      const foreignDoc = doc(BOB);
      const own = target[kind](ALICE);

      await expect(service.link(ALICE, foreignDoc, kind, own)).rejects.toThrow(
        new NotFoundException('Document not found.'),
      );
      expect(store.links.size).toBe(0);
    });

    it(`cannot unlink through another user's document or ${kind}`, async () => {
      const bobsDoc = doc(BOB);
      const bobsTarget = target[kind](BOB);
      await store.link(kind, {
        ownerId: BOB,
        documentId: bobsDoc,
        targetId: bobsTarget,
      });

      await expect(
        service.unlink(ALICE, bobsDoc, kind, bobsTarget),
      ).rejects.toThrow(NotFoundException);
      expect(store.links.size).toBe(1);
    });

    it('maps a concurrent delete of the target (FK violation) to 404', async () => {
      const documentId = doc(ALICE);
      const targetId = target[kind](ALICE);
      jest.spyOn(store, 'link').mockRejectedValueOnce(
        new QueryFailedError('INSERT', [], {
          code: '23503',
          constraint: `FK_document_${kind}s_${kind}`,
        } as unknown as Error),
      );

      await expect(
        service.link(ALICE, documentId, kind, targetId),
      ).rejects.toThrow(notFound[kind]);
    });
  });

  it('a 404 for a missing record looks the same as for a foreign one', async () => {
    const documentId = doc(ALICE);
    const foreign = target.project(BOB);

    const a = await service
      .link(ALICE, documentId, 'project', foreign)
      .catch((e: unknown) => e);
    const b = await service
      .link(ALICE, documentId, 'project', crypto.randomUUID())
      .catch((e: unknown) => e);

    expect(a).toEqual(b);
  });
});
