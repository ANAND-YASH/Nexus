import { Injectable } from '@nestjs/common';
import type {
  ContextResourceType,
  ContextResponse,
  ResourceRef,
} from '@nexus/types';
import { toContextRelationshipResponse } from '../relationships/context-relationship.mapper';
import { ContextRelationshipsStore } from '../relationships/context-relationships.store';
import { NOT_FOUND_BY_TYPE } from '../relationships/context-relationships.service';
import {
  ContextGraphStore,
  emptyIds,
  type IdsByType,
} from './context-graph.store';

/** Caps keep the response bounded no matter how connected a node is. */
export const NEIGHBOR_LIMIT = 100;
export const RELATIONSHIP_LIMIT = 200;

/**
 * Depth-1 context of one resource: the resource, its graph relationships and
 * the resources directly connected to it (through relationships or built-in
 * links). Deliberately not recursive: a fixed, small number of queries per
 * request, deterministic ordering, bounded size.
 */
@Injectable()
export class ContextService {
  constructor(
    private readonly graph: ContextGraphStore,
    private readonly relationships: ContextRelationshipsStore,
  ) {}

  async getContext(
    ownerId: string,
    ref: ResourceRef,
  ): Promise<ContextResponse> {
    const resource = await this.graph.findNode(ownerId, ref);
    if (!resource) throw NOT_FOUND_BY_TYPE[ref.type]();

    const [edges, structural] = await Promise.all([
      this.relationships.forResource(ownerId, ref, RELATIONSHIP_LIMIT + 1),
      this.graph.structuralNeighbors(ownerId, resource, NEIGHBOR_LIMIT + 1),
    ]);
    let truncated = edges.length > RELATIONSHIP_LIMIT;
    const relationships = edges.slice(0, RELATIONSHIP_LIMIT);

    // Neighbour ids: built-in links first, then the other end of each edge.
    const ids = emptyIds();
    const add = (type: ContextResourceType, id: string) => {
      if (type === ref.type && id === ref.id) return;
      if (!ids[type].includes(id)) ids[type].push(id);
    };
    for (const type of Object.keys(structural) as ContextResourceType[]) {
      structural[type].forEach((id) => add(type, id));
    }
    for (const edge of relationships) {
      const isSource = edge.sourceType === ref.type && edge.sourceId === ref.id;
      add(
        isSource ? edge.targetType : edge.sourceType,
        isSource ? edge.targetId : edge.sourceId,
      );
    }
    for (const type of Object.keys(ids) as ContextResourceType[]) {
      if (ids[type].length > NEIGHBOR_LIMIT) {
        ids[type] = ids[type].slice(0, NEIGHBOR_LIMIT);
        truncated = true;
      }
    }

    const nodes = await this.graph.loadNodes(ownerId, ids);
    const found = foundIds(nodes);
    const requested = idSets(ids);

    return {
      resource,
      related: {
        documents: nodes.DOCUMENT,
        projects: nodes.PROJECT,
        tasks: nodes.TASK,
        goals: nodes.GOAL,
        entities: nodes.ENTITY,
        // Drop an edge only if its other endpoint was looked up and is gone.
        relationships: relationships
          .filter((edge) => {
            const isSource =
              edge.sourceType === ref.type && edge.sourceId === ref.id;
            const type = isSource ? edge.targetType : edge.sourceType;
            const id = isSource ? edge.targetId : edge.sourceId;
            return !requested[type].has(id) || found[type].has(id);
          })
          .map(toContextRelationshipResponse),
      },
      truncated,
    };
  }
}

function idSets(ids: IdsByType): Record<ContextResourceType, Set<string>> {
  return {
    DOCUMENT: new Set(ids.DOCUMENT),
    PROJECT: new Set(ids.PROJECT),
    TASK: new Set(ids.TASK),
    GOAL: new Set(ids.GOAL),
    ENTITY: new Set(ids.ENTITY),
  };
}

function foundIds(
  nodes: Awaited<ReturnType<ContextGraphStore['loadNodes']>>,
): Record<ContextResourceType, Set<string>> {
  const ids = (list: { id: string }[]) => new Set(list.map((n) => n.id));
  return {
    DOCUMENT: ids(nodes.DOCUMENT),
    PROJECT: ids(nodes.PROJECT),
    TASK: ids(nodes.TASK),
    GOAL: ids(nodes.GOAL),
    ENTITY: ids(nodes.ENTITY),
  };
}
