import { NotFoundException } from '@nestjs/common';
import { ProjectStatus, TaskPriority, TaskStatus } from '@nexus/types';
import { QueryFailedError } from 'typeorm';
import type { Project } from '../projects/project.entity';
import { ProjectsService } from '../projects/projects.service';
import { InMemoryRepository } from '../testing/in-memory-repository';
import type { Task } from './task.entity';
import { TasksService } from './tasks.service';

const ALICE = '00000000-0000-4000-8000-00000000000a';
const BOB = '00000000-0000-4000-8000-00000000000b';

describe('TasksService', () => {
  let tasks: InMemoryRepository<Task>;
  let projects: InMemoryRepository<Project>;
  let service: TasksService;

  const project = (ownerId: string) =>
    projects.seed({
      ownerId,
      name: 'P',
      description: null,
      status: ProjectStatus.ACTIVE,
    });

  const bobsTask = () =>
    tasks.seed({
      ownerId: BOB,
      projectId: null,
      title: "Bob's task",
      description: null,
      status: TaskStatus.TODO,
      priority: TaskPriority.MEDIUM,
      dueAt: null,
      completedAt: null,
    });

  beforeEach(() => {
    tasks = new InMemoryRepository<Task>();
    projects = new InMemoryRepository<Project>();
    service = new TasksService(
      tasks.asRepository(),
      new ProjectsService(projects.asRepository()),
    );
  });

  describe('create', () => {
    it('creates a task owned by the caller with defaults', async () => {
      const task = await service.create(ALICE, { title: 'Write spec' });

      expect(task).toEqual({
        id: expect.any(String),
        projectId: null,
        title: 'Write spec',
        description: null,
        status: 'TODO',
        priority: 'MEDIUM',
        dueAt: null,
        completedAt: null,
        createdAt: expect.any(String),
        updatedAt: expect.any(String),
      });
      expect(task).not.toHaveProperty('ownerId');
      expect(tasks.rows[0]!.ownerId).toBe(ALICE);
    });

    it('normalizes dueAt to UTC ISO', async () => {
      const task = await service.create(ALICE, {
        title: 'T',
        dueAt: '2026-10-31T17:00:00+05:30',
      });
      expect(task.dueAt).toBe('2026-10-31T11:30:00.000Z');
    });

    it('creates a task in an own project', async () => {
      const { id: projectId } = project(ALICE);

      const task = await service.create(ALICE, { title: 'T', projectId });

      expect(task.projectId).toBe(projectId);
    });

    it("rejects another user's project with 404 and stores nothing", async () => {
      const { id: projectId } = project(BOB);

      await expect(
        service.create(ALICE, { title: 'T', projectId }),
      ).rejects.toThrow(new NotFoundException('Project not found.'));
      expect(tasks.rows).toHaveLength(0);
    });

    it('stamps completedAt when created as COMPLETED', async () => {
      const task = await service.create(ALICE, {
        title: 'Already done',
        status: TaskStatus.COMPLETED,
      });
      expect(task.completedAt).toEqual(expect.any(String));
    });

    it('maps a project deleted mid-request (FK violation) to 404', async () => {
      const { id: projectId } = project(ALICE);
      jest.spyOn(tasks, 'save').mockRejectedValueOnce(
        new QueryFailedError('INSERT', [], {
          code: '23503',
          constraint: 'FK_tasks_project_id_owner_id',
        } as unknown as Error),
      );

      await expect(
        service.create(ALICE, { title: 'T', projectId }),
      ).rejects.toThrow('Project not found.');
    });
  });

  describe('list', () => {
    it("returns only the caller's tasks", async () => {
      await service.create(ALICE, { title: 'Mine' });
      bobsTask();

      expect((await service.list(ALICE, {})).map((t) => t.title)).toEqual([
        'Mine',
      ]);
    });

    it('filters by status, priority and projectId (combined)', async () => {
      const { id: projectId } = project(ALICE);
      await service.create(ALICE, { title: 'a', priority: TaskPriority.HIGH });
      await service.create(ALICE, {
        title: 'b',
        priority: TaskPriority.HIGH,
        projectId,
      });
      await service.create(ALICE, {
        title: 'c',
        priority: TaskPriority.LOW,
        projectId,
        status: TaskStatus.IN_PROGRESS,
      });

      const titles = async (q: Parameters<TasksService['list']>[1]) =>
        (await service.list(ALICE, q)).map((t) => t.title).sort();

      expect(await titles({ status: TaskStatus.IN_PROGRESS })).toEqual(['c']);
      expect(await titles({ priority: TaskPriority.HIGH })).toEqual(['a', 'b']);
      expect(await titles({ projectId })).toEqual(['b', 'c']);
      expect(await titles({ projectId, priority: TaskPriority.HIGH })).toEqual([
        'b',
      ]);
    });

    it("returns nothing when filtering by another user's projectId", async () => {
      const { id: projectId } = project(BOB);
      tasks.seed({ ...bobsTask(), id: undefined, projectId });

      await expect(service.list(ALICE, { projectId })).resolves.toEqual([]);
    });
  });

  describe('get', () => {
    it('returns an own task', async () => {
      const { id } = await service.create(ALICE, { title: 'Mine' });
      await expect(service.get(ALICE, id)).resolves.toMatchObject({ id });
    });

    it("hides another user's task behind 404", async () => {
      const { id } = bobsTask();
      await expect(service.get(ALICE, id)).rejects.toThrow(
        new NotFoundException('Task not found.'),
      );
    });
  });

  describe('update', () => {
    it('updates only provided fields', async () => {
      const { id } = await service.create(ALICE, {
        title: 'Old',
        description: 'keep',
        priority: TaskPriority.LOW,
      });

      const updated = await service.update(ALICE, id, {
        title: 'New',
        dueAt: '2026-12-01T09:00:00Z',
      });

      expect(updated).toMatchObject({
        title: 'New',
        description: 'keep',
        priority: 'LOW',
        dueAt: '2026-12-01T09:00:00.000Z',
      });
    });

    it('moves a task into an own project and detaches it with null', async () => {
      const { id: projectId } = project(ALICE);
      const { id } = await service.create(ALICE, { title: 'T' });

      await expect(
        service.update(ALICE, id, { projectId }),
      ).resolves.toMatchObject({ projectId });
      await expect(
        service.update(ALICE, id, { projectId: null }),
      ).resolves.toMatchObject({ projectId: null });
    });

    it("refuses to move a task into another user's project", async () => {
      const { id: foreignProject } = project(BOB);
      const { id } = await service.create(ALICE, { title: 'T' });

      await expect(
        service.update(ALICE, id, { projectId: foreignProject }),
      ).rejects.toThrow('Project not found.');
      expect(tasks.rows[0]!.projectId).toBeNull();
    });

    it("cannot update another user's task", async () => {
      const { id } = bobsTask();

      await expect(
        service.update(ALICE, id, { title: 'Hijacked' }),
      ).rejects.toThrow(NotFoundException);
      expect(tasks.rows[0]!.title).toBe("Bob's task");
    });
  });

  describe('completedAt', () => {
    it('completing a task sets completedAt', async () => {
      const { id } = await service.create(ALICE, { title: 'T' });

      const before = Date.now();
      const done = await service.update(ALICE, id, {
        status: TaskStatus.COMPLETED,
      });

      expect(done.status).toBe('COMPLETED');
      expect(Date.parse(done.completedAt!)).toBeGreaterThanOrEqual(before);
    });

    it('keeps the original completedAt while it stays COMPLETED', async () => {
      const { id } = await service.create(ALICE, { title: 'T' });
      const done = await service.update(ALICE, id, {
        status: TaskStatus.COMPLETED,
      });

      const again = await service.update(ALICE, id, {
        status: TaskStatus.COMPLETED,
        title: 'Renamed',
      });

      expect(again.completedAt).toBe(done.completedAt);
    });

    it('reopening a task clears completedAt', async () => {
      const { id } = await service.create(ALICE, {
        title: 'T',
        status: TaskStatus.COMPLETED,
      });

      const reopened = await service.update(ALICE, id, {
        status: TaskStatus.IN_PROGRESS,
      });

      expect(reopened.completedAt).toBeNull();
    });

    it('editing other fields of a completed task keeps completedAt', async () => {
      const { id, completedAt } = await service.create(ALICE, {
        title: 'T',
        status: TaskStatus.COMPLETED,
      });

      await expect(
        service.update(ALICE, id, { priority: TaskPriority.URGENT }),
      ).resolves.toMatchObject({ completedAt });
    });
  });

  describe('remove', () => {
    it('deletes an own task', async () => {
      const { id } = await service.create(ALICE, { title: 'Bye' });
      await service.remove(ALICE, id);
      expect(tasks.rows).toHaveLength(0);
    });

    it("cannot delete another user's task", async () => {
      const { id } = bobsTask();
      await expect(service.remove(ALICE, id)).rejects.toThrow(
        NotFoundException,
      );
      expect(tasks.rows).toHaveLength(1);
    });
  });
});
