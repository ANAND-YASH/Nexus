import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import type { ResourceRef } from '@nexus/types';
import {
  ALICE,
  BOB,
  InMemoryRelationshipsStore,
  uuid,
} from '../testing/context-test-utils';
import { ContextRelationshipsService } from './context-relationships.service';

describe('ContextRelationshipsService', () => {
  let store: InMemoryRelationshipsStore;
  let service: ContextRelationshipsService;
  let project: ResourceRef;
  let goal: ResourceRef;
  let doc: ResourceRef;

  beforeEach(() => {
    store = new InMemoryRelationshipsStore();
    service = new ContextRelationshipsService(store.asStore());
    project = store.own(ALICE, { type: 'PROJECT', id: uuid() });
    goal = store.own(ALICE, { type: 'GOAL', id: uuid() });
    doc = store.own(ALICE, { type: 'DOCUMENT', id: uuid() });
  });

  const fromUser = (patch: Record<string, unknown> = {}) =>
    service.createFromUser(ALICE, {
      sourceType: project.type,
      sourceId: project.id,
      relationshipType: 'SUPPORTS',
      targetType: goal.type,
      targetId: goal.id,
      ...patch,
    });

  it('creates a USER relationship with confidence 1 and returns a clean shape', async () => {
    const created = await fromUser({ metadata: { note: 'key' } });

    expect(created).toEqual({
      id: expect.any(String),
      sourceType: 'PROJECT',
      sourceId: project.id,
      relationshipType: 'SUPPORTS',
      targetType: 'GOAL',
      targetId: goal.id,
      confidence: 1,
      source: 'USER',
      sourceDocumentId: null,
      metadata: { note: 'key' },
      createdAt: expect.any(String),
      updatedAt: expect.any(String),
    });
    expect(created).not.toHaveProperty('ownerId');
  });

  it('rejects a duplicate with 409', async () => {
    await fromUser();
    await expect(fromUser()).rejects.toThrow(ConflictException);
    expect(store.rows).toHaveLength(1);
  });

  it.each([
    ['source', 'sourceId', 'Project not found.'],
    ['target', 'targetId', 'Goal not found.'],
  ])('a missing %s is the safe 404 of its type', async (_l, field, message) => {
    await expect(fromUser({ [field]: uuid() })).rejects.toThrow(
      new NotFoundException(message),
    );
  });

  it('a cross-owner source or target is the same 404 and stores nothing', async () => {
    const bobsProject = store.own(BOB, { type: 'PROJECT', id: uuid() });
    const bobsGoal = store.own(BOB, { type: 'GOAL', id: uuid() });

    await expect(fromUser({ sourceId: bobsProject.id })).rejects.toThrow(
      'Project not found.',
    );
    await expect(fromUser({ targetId: bobsGoal.id })).rejects.toThrow(
      'Goal not found.',
    );
    expect(store.rows).toHaveLength(0);
  });

  it('validates the source document (must be the owner’s)', async () => {
    await expect(fromUser({ sourceDocumentId: uuid() })).rejects.toThrow(
      'Document not found.',
    );
    await expect(fromUser({ sourceDocumentId: doc.id })).resolves.toMatchObject(
      {
        sourceDocumentId: doc.id,
      },
    );
  });

  it('rejects invalid relationships before touching the store', async () => {
    const insert = jest.spyOn(store, 'insert');
    await expect(
      fromUser({ targetType: 'PROJECT', targetId: project.id }),
    ).rejects.toThrow(BadRequestException);
    expect(insert).not.toHaveBeenCalled();
  });

  it('keeps AI provenance as AI (never converted to USER)', async () => {
    const entity = store.own(ALICE, { type: 'ENTITY', id: uuid() });
    const created = await service.create(ALICE, {
      source: doc,
      relationshipType: 'MENTIONS',
      target: entity,
      provenance: 'AI',
      confidence: 0.8,
      sourceDocumentId: doc.id,
      metadata: null,
    });
    expect(created).toMatchObject({ source: 'AI', confidence: 0.8 });
  });

  it('lists only the owner’s relationships, with filters', async () => {
    await fromUser();
    const entity = store.own(ALICE, { type: 'ENTITY', id: uuid() });
    await fromUser({
      relationshipType: 'USES',
      targetType: 'ENTITY',
      targetId: entity.id,
    });
    const bobsA = store.own(BOB, { type: 'TASK', id: uuid() });
    const bobsB = store.own(BOB, { type: 'TASK', id: uuid() });
    await service.createFromUser(BOB, {
      sourceType: 'TASK',
      sourceId: bobsA.id,
      relationshipType: 'BLOCKS',
      targetType: 'TASK',
      targetId: bobsB.id,
    });

    expect(await service.list(ALICE, {})).toHaveLength(2);
    expect(
      (await service.list(ALICE, { relationshipType: 'USES' })).map(
        (r) => r.targetId,
      ),
    ).toEqual([entity.id]);
    expect(await service.list(ALICE, { relationshipType: 'BLOCKS' })).toEqual(
      [],
    );
  });

  it('deletes own relationships; another user’s is a 404', async () => {
    const created = await fromUser();
    await expect(service.remove(BOB, created.id)).rejects.toThrow(
      new NotFoundException('Relationship not found.'),
    );
    await service.remove(ALICE, created.id);
    expect(store.rows).toHaveLength(0);
  });
});
