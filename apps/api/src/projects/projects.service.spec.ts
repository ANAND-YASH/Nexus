import { NotFoundException } from '@nestjs/common';
import { ProjectStatus } from '@nexus/types';
import { InMemoryRepository } from '../testing/in-memory-repository';
import type { Project } from './project.entity';
import { ProjectsService } from './projects.service';

const ALICE = '00000000-0000-4000-8000-00000000000a';
const BOB = '00000000-0000-4000-8000-00000000000b';

describe('ProjectsService', () => {
  let repo: InMemoryRepository<Project>;
  let service: ProjectsService;

  beforeEach(() => {
    repo = new InMemoryRepository<Project>();
    service = new ProjectsService(repo.asRepository());
  });

  const bobsProject = () =>
    repo.seed({
      ownerId: BOB,
      name: "Bob's",
      description: null,
      status: ProjectStatus.ACTIVE,
    });

  describe('create', () => {
    it('creates a project owned by the caller with defaults', async () => {
      const project = await service.create(ALICE, { name: 'Launch' });

      expect(project).toEqual({
        id: expect.any(String),
        name: 'Launch',
        description: null,
        status: 'ACTIVE',
        createdAt: expect.any(String),
        updatedAt: expect.any(String),
      });
      expect(repo.rows[0]!.ownerId).toBe(ALICE);
    });

    it('never exposes ownerId in the response', async () => {
      const project = await service.create(ALICE, { name: 'Launch' });
      expect(project).not.toHaveProperty('ownerId');
    });
  });

  describe('list', () => {
    it("returns only the caller's projects, newest first", async () => {
      await service.create(ALICE, { name: 'First' });
      bobsProject();
      await service.create(ALICE, { name: 'Second' });

      const projects = await service.list(ALICE, {});

      expect(projects.map((p) => p.name)).toEqual(['Second', 'First']);
    });

    it('filters by status', async () => {
      await service.create(ALICE, { name: 'Active' });
      await service.create(ALICE, {
        name: 'Done',
        status: ProjectStatus.COMPLETED,
      });

      const projects = await service.list(ALICE, {
        status: ProjectStatus.COMPLETED,
      });

      expect(projects.map((p) => p.name)).toEqual(['Done']);
    });
  });

  describe('get', () => {
    it('returns an own project', async () => {
      const { id } = await service.create(ALICE, { name: 'Mine' });
      await expect(service.get(ALICE, id)).resolves.toMatchObject({
        id,
        name: 'Mine',
      });
    });

    it("hides another user's project behind the same 404 as a missing one", async () => {
      const { id } = bobsProject();

      const foreign = await service.get(ALICE, id).catch((e: unknown) => e);
      const missing = await service
        .get(ALICE, crypto.randomUUID())
        .catch((e: unknown) => e);

      expect(foreign).toBeInstanceOf(NotFoundException);
      expect(foreign).toEqual(missing);
    });
  });

  describe('update', () => {
    it('updates only the provided fields', async () => {
      const { id } = await service.create(ALICE, {
        name: 'Old',
        description: 'Keep me',
      });

      const updated = await service.update(ALICE, id, {
        status: ProjectStatus.ARCHIVED,
      });

      expect(updated).toMatchObject({
        name: 'Old',
        description: 'Keep me',
        status: 'ARCHIVED',
      });
    });

    it('clears the description with null', async () => {
      const { id } = await service.create(ALICE, {
        name: 'P',
        description: 'x',
      });
      await expect(
        service.update(ALICE, id, { description: null }),
      ).resolves.toMatchObject({ description: null });
    });

    it("cannot update another user's project", async () => {
      const { id } = bobsProject();

      await expect(
        service.update(ALICE, id, { name: 'Hijacked' }),
      ).rejects.toThrow(NotFoundException);
      expect(repo.rows[0]!.name).toBe("Bob's");
    });
  });

  describe('remove', () => {
    it('deletes an own project', async () => {
      const { id } = await service.create(ALICE, { name: 'Bye' });
      await service.remove(ALICE, id);
      expect(repo.rows).toHaveLength(0);
    });

    it("cannot delete another user's project", async () => {
      const { id } = bobsProject();
      await expect(service.remove(ALICE, id)).rejects.toThrow(
        NotFoundException,
      );
      expect(repo.rows).toHaveLength(1);
    });
  });

  describe('assertOwned', () => {
    it('passes for an own project and 404s for a foreign or missing one', async () => {
      const { id } = await service.create(ALICE, { name: 'Mine' });

      await expect(service.assertOwned(ALICE, id)).resolves.toBeUndefined();
      await expect(service.assertOwned(BOB, id)).rejects.toThrow(
        'Project not found.',
      );
      await expect(
        service.assertOwned(ALICE, crypto.randomUUID()),
      ).rejects.toThrow('Project not found.');
    });
  });
});
