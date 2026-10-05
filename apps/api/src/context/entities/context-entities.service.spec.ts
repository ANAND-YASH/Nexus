import { ConflictException, NotFoundException } from '@nestjs/common';
import {
  QueryFailedError,
  type Repository,
  type SelectQueryBuilder,
} from 'typeorm';
import { InMemoryRepository } from '../../testing/in-memory-repository';
import { ALICE, BOB } from '../testing/context-test-utils';
import { ContextEntitiesService } from './context-entities.service';
import type { ContextEntity } from './context-entity.entity';

describe('ContextEntitiesService', () => {
  let repo: InMemoryRepository<ContextEntity>;
  let service: ContextEntitiesService;

  beforeEach(() => {
    repo = new InMemoryRepository<ContextEntity>();
    service = new ContextEntitiesService(repo.asRepository());
  });

  const bobs = () =>
    repo.seed({
      ownerId: BOB,
      name: 'Bob Corp',
      normalizedName: 'bob corp',
      type: 'ORGANIZATION',
      description: 'secret',
      metadata: null,
    });

  it('creates with a cleaned display name and a normalized lookup name', async () => {
    const entity = await service.create(ALICE, {
      name: '  ACME   Corp ',
      type: 'ORGANIZATION',
      metadata: { source: 'manual' },
    });

    expect(entity).toEqual({
      id: expect.any(String),
      name: 'ACME Corp',
      type: 'ORGANIZATION',
      description: null,
      metadata: { source: 'manual' },
      createdAt: expect.any(String),
      updatedAt: expect.any(String),
    });
    expect(repo.rows[0]).toMatchObject({
      ownerId: ALICE,
      normalizedName: 'acme corp',
    });
    expect(entity).not.toHaveProperty('ownerId');
    expect(entity).not.toHaveProperty('normalizedName');
  });

  it('maps the name uniqueness constraint to 409', async () => {
    jest.spyOn(repo, 'save').mockRejectedValueOnce(
      new QueryFailedError('INSERT', [], {
        code: '23505',
        constraint: 'UQ_context_entities_owner_id_type_normalized_name',
      } as unknown as Error),
    );

    await expect(
      service.create(ALICE, { name: 'Acme', type: 'ORGANIZATION' }),
    ).rejects.toThrow(ConflictException);
  });

  it('gets an own entity; another user’s is the same 404 as a missing one', async () => {
    const { id } = await service.create(ALICE, { name: 'Ada', type: 'PERSON' });
    await expect(service.get(ALICE, id)).resolves.toMatchObject({ id });

    const foreign = await service
      .get(ALICE, bobs().id)
      .catch((e: unknown) => e);
    const missing = await service
      .get(ALICE, crypto.randomUUID())
      .catch((e: unknown) => e);
    expect(foreign).toBeInstanceOf(NotFoundException);
    expect(foreign).toEqual(missing);
    expect(JSON.stringify(foreign)).not.toContain('Bob');
  });

  it('PATCH: renaming re-normalizes; omitted fields stay; null clears', async () => {
    const { id } = await service.create(ALICE, {
      name: 'Ada',
      type: 'PERSON',
      description: 'Mathematician',
      metadata: { a: 1 },
    });

    const updated = await service.update(ALICE, id, {
      name: '  Ada   LOVELACE ',
      metadata: null,
    });

    expect(updated).toMatchObject({
      name: 'Ada LOVELACE',
      type: 'PERSON',
      description: 'Mathematician',
      metadata: null,
    });
    expect(repo.rows[0]!.normalizedName).toBe('ada lovelace');
  });

  it("cannot update or delete another user's entity", async () => {
    const { id } = bobs();
    await expect(service.update(ALICE, id, { name: 'x' })).rejects.toThrow(
      NotFoundException,
    );
    await expect(service.remove(ALICE, id)).rejects.toThrow(NotFoundException);
    expect(repo.rows[0]!.name).toBe('Bob Corp');
  });

  it('deletes an own entity', async () => {
    const { id } = await service.create(ALICE, { name: 'Ada', type: 'PERSON' });
    await service.remove(ALICE, id);
    expect(repo.rows).toHaveLength(0);
  });

  describe('list (query construction)', () => {
    const recorded: { sql: string; params: Record<string, unknown> }[] = [];
    const listWith = async (
      query: Parameters<ContextEntitiesService['list']>[1],
    ) => {
      recorded.length = 0;
      const qb = {
        where: (sql: string, params = {}) => (
          recorded.push({ sql, params }),
          qb
        ),
        andWhere: (sql: string, params = {}) => (
          recorded.push({ sql, params }),
          qb
        ),
        orderBy: () => qb,
        addOrderBy: () => qb,
        getMany: () => Promise.resolve([]),
      };
      const repository = {
        createQueryBuilder: () =>
          qb as unknown as SelectQueryBuilder<ContextEntity>,
      } as unknown as Repository<ContextEntity>;
      await new ContextEntitiesService(repository).list(ALICE, query);
      return recorded;
    };

    it('always scopes by owner first', async () => {
      expect((await listWith({}))[0]).toEqual({
        sql: 'entity.ownerId = :ownerId',
        params: { ownerId: ALICE },
      });
    });

    it('filters by type and searches the normalized name with escaped wildcards', async () => {
      const clauses = await listWith({ type: 'PERSON', search: ' 50%_Off\\ ' });

      expect(clauses[1]).toEqual({
        sql: 'entity.type = :type',
        params: { type: 'PERSON' },
      });
      expect(clauses[2]!.params).toEqual({ pattern: '%50\\%\\_off\\\\%' });
      expect(clauses[2]!.sql).not.toContain('50');
    });
  });
});
