import { NotFoundException } from '@nestjs/common';
import type { ContextNode, ResourceRef } from '@nexus/types';
import { ContextRelationshipsService } from '../relationships/context-relationships.service';
import {
  ALICE,
  BOB,
  InMemoryRelationshipsStore,
  uuid,
} from '../testing/context-test-utils';
import {
  type ContextGraphStore,
  emptyIds,
  type IdsByType,
  type NodesByType,
} from './context-graph.store';
import { ContextService, NEIGHBOR_LIMIT } from './context.service';

const stamp = {
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

/** Graph store fake: nodes keyed by owner/type/id; records loadNodes calls. */
class FakeGraphStore {
  readonly nodes = new Map<string, ContextNode>();
  structural = emptyIds();
  readonly loads: IdsByType[] = [];

  add(ownerId: string, node: ContextNode) {
    this.nodes.set(`${ownerId}|${node.resourceType}|${node.id}`, node);
    return { type: node.resourceType, id: node.id } as ResourceRef;
  }

  findNode(ownerId: string, ref: ResourceRef) {
    return Promise.resolve(
      this.nodes.get(`${ownerId}|${ref.type}|${ref.id}`) ?? null,
    );
  }

  structuralNeighbors() {
    return Promise.resolve(this.structural);
  }

  loadNodes(ownerId: string, ids: IdsByType): Promise<NodesByType> {
    this.loads.push(ids);
    const pick = (type: ContextNode['resourceType']) =>
      ids[type]
        .map((id) => this.nodes.get(`${ownerId}|${type}|${id}`))
        .filter((n): n is ContextNode => !!n)
        .map(({ resourceType: _t, ...rest }) => rest);
    return Promise.resolve({
      DOCUMENT: pick('DOCUMENT'),
      PROJECT: pick('PROJECT'),
      TASK: pick('TASK'),
      GOAL: pick('GOAL'),
      ENTITY: pick('ENTITY'),
    } as NodesByType);
  }
}

describe('ContextService', () => {
  let graph: FakeGraphStore;
  let store: InMemoryRelationshipsStore;
  let relationships: ContextRelationshipsService;
  let service: ContextService;

  const project = (ownerId = ALICE) =>
    graph.add(ownerId, {
      resourceType: 'PROJECT',
      id: uuid(),
      name: 'P',
      status: 'ACTIVE',
      ...stamp,
    });
  const entity = (ownerId = ALICE) =>
    graph.add(ownerId, {
      resourceType: 'ENTITY',
      id: uuid(),
      name: 'E',
      type: 'PERSON',
      ...stamp,
    });
  const goal = (ownerId = ALICE) =>
    graph.add(ownerId, {
      resourceType: 'GOAL',
      id: uuid(),
      title: 'G',
      status: 'ACTIVE',
      targetDate: null,
      ...stamp,
    });

  const relate = (
    source: ResourceRef,
    target: ResourceRef,
    ownerId = ALICE,
  ) => {
    store.own(ownerId, source);
    store.own(ownerId, target);
    return relationships.create(ownerId, {
      source,
      relationshipType: 'RELATED_TO',
      target,
      provenance: 'USER',
      confidence: 1,
      sourceDocumentId: null,
      metadata: null,
    });
  };

  beforeEach(() => {
    graph = new FakeGraphStore();
    store = new InMemoryRelationshipsStore();
    relationships = new ContextRelationshipsService(store.asStore());
    service = new ContextService(
      graph as unknown as ContextGraphStore,
      store.asStore(),
    );
  });

  it('returns the resource with neighbours from both edge directions', async () => {
    const p = project();
    const e = entity();
    const g = goal();
    await relate(p, e); // outgoing
    await relate(g, p); // incoming

    const context = await service.getContext(ALICE, p);

    expect(context.resource).toMatchObject({
      resourceType: 'PROJECT',
      id: p.id,
    });
    expect(context.related.entities.map((n) => n.id)).toEqual([e.id]);
    expect(context.related.goals.map((n) => n.id)).toEqual([g.id]);
    expect(context.related.relationships).toHaveLength(2);
    expect(context.truncated).toBe(false);
  });

  it('merges built-in links and de-duplicates neighbours', async () => {
    const p = project();
    const g = goal();
    await relate(p, g);
    graph.structural = { ...emptyIds(), GOAL: [g.id] };

    const context = await service.getContext(ALICE, p);

    expect(context.related.goals).toHaveLength(1);
    expect(graph.loads[0]!.GOAL).toEqual([g.id]);
  });

  it('batches neighbour loading (one call regardless of edge count)', async () => {
    const p = project();
    for (let i = 0; i < 5; i++) await relate(p, entity());

    await service.getContext(ALICE, p);

    expect(graph.loads).toHaveLength(1);
    expect(graph.loads[0]!.ENTITY).toHaveLength(5);
  });

  it('drops edges whose other endpoint no longer exists', async () => {
    const p = project();
    const ghost: ResourceRef = { type: 'TASK', id: uuid() };
    await relate(p, ghost);

    const context = await service.getContext(ALICE, p);

    expect(context.related.relationships).toEqual([]);
    expect(context.related.tasks).toEqual([]);
  });

  it('caps neighbour lists and reports truncation', async () => {
    const p = project();
    graph.structural = {
      ...emptyIds(),
      TASK: Array.from({ length: NEIGHBOR_LIMIT + 1 }, () => uuid()),
    };

    const context = await service.getContext(ALICE, p);

    expect(graph.loads[0]!.TASK).toHaveLength(NEIGHBOR_LIMIT);
    expect(context.truncated).toBe(true);
  });

  it.each(['DOCUMENT', 'PROJECT', 'TASK', 'GOAL', 'ENTITY'] as const)(
    'a missing %s is a 404',
    async (type) => {
      await expect(
        service.getContext(ALICE, { type, id: uuid() }),
      ).rejects.toThrow(NotFoundException);
    },
  );

  it("never returns another user's resource or edges", async () => {
    const bobsProject = project(BOB);
    await relate(bobsProject, entity(BOB), BOB);

    await expect(service.getContext(ALICE, bobsProject)).rejects.toThrow(
      new NotFoundException('Project not found.'),
    );
  });
});
