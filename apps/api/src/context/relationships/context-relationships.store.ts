import { Injectable } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import type { ResourceRef } from '@nexus/types';
import { DataSource, Repository } from 'typeorm';
import type { QueryDeepPartialEntity } from 'typeorm/query-builder/QueryPartialEntity';
import { ContextRelationship } from './context-relationship.entity';
import type { NewRelationship } from './relationship-rules';
import { lockOwnedResources } from './resource-ownership';

export type InsertResult =
  | { kind: 'created'; relationship: ContextRelationship }
  | { kind: 'duplicate' }
  | { kind: 'not-found'; ref: ResourceRef };

export interface RelationshipFilter {
  sourceType?: ContextRelationship['sourceType'];
  sourceId?: string;
  targetType?: ContextRelationship['targetType'];
  targetId?: string;
  relationshipType?: ContextRelationship['relationshipType'];
  source?: ContextRelationship['source'];
}

/**
 * Persistence for context_relationships. Inserts run in one transaction that
 * first locks every referenced resource (owner-scoped), then inserts with
 * `ON CONFLICT DO NOTHING` on the unique edge key — concurrent duplicates
 * resolve to exactly one row.
 */
@Injectable()
export class ContextRelationshipsStore {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    @InjectRepository(ContextRelationship)
    private readonly relationships: Repository<ContextRelationship>,
  ) {}

  insert(ownerId: string, input: NewRelationship): Promise<InsertResult> {
    return this.dataSource.transaction(async (manager) => {
      const refs: ResourceRef[] = [input.source, input.target];
      if (input.sourceDocumentId) {
        refs.push({ type: 'DOCUMENT', id: input.sourceDocumentId });
      }
      const missing = await lockOwnedResources(manager, ownerId, refs);
      if (missing) return { kind: 'not-found', ref: missing };

      const result = await manager
        .createQueryBuilder()
        .insert()
        .into(ContextRelationship)
        .values({
          ownerId,
          sourceType: input.source.type,
          sourceId: input.source.id,
          relationshipType: input.relationshipType,
          targetType: input.target.type,
          targetId: input.target.id,
          confidence: input.confidence,
          source: input.provenance,
          sourceDocumentId: input.sourceDocumentId,
          metadata: input.metadata,
        } as QueryDeepPartialEntity<ContextRelationship>)
        .orIgnore()
        .returning(['id'])
        .execute();
      const [row] = result.raw as { id: string }[];
      if (!row) return { kind: 'duplicate' };
      return {
        kind: 'created',
        relationship: await manager.findOneByOrFail(ContextRelationship, {
          id: row.id,
        }),
      };
    });
  }

  /** Newest first; always scoped by owner. */
  list(
    ownerId: string,
    filter: RelationshipFilter,
  ): Promise<ContextRelationship[]> {
    return this.relationships.find({
      where: { ownerId, ...filter },
      order: { createdAt: 'DESC', id: 'ASC' },
    });
  }

  /** Edges touching the resource in either direction (depth 1). */
  forResource(
    ownerId: string,
    ref: ResourceRef,
    limit: number,
  ): Promise<ContextRelationship[]> {
    return this.relationships.find({
      where: [
        { ownerId, sourceType: ref.type, sourceId: ref.id },
        { ownerId, targetType: ref.type, targetId: ref.id },
      ],
      order: { createdAt: 'DESC', id: 'ASC' },
      take: limit,
    });
  }

  async exists(
    ownerId: string,
    edge: Omit<
      NewRelationship,
      'provenance' | 'confidence' | 'sourceDocumentId' | 'metadata'
    >,
  ): Promise<boolean> {
    return this.relationships.exists({
      where: {
        ownerId,
        sourceType: edge.source.type,
        sourceId: edge.source.id,
        relationshipType: edge.relationshipType,
        targetType: edge.target.type,
        targetId: edge.target.id,
      },
    });
  }

  async remove(ownerId: string, id: string): Promise<boolean> {
    const result = await this.relationships.delete({ id, ownerId });
    return (result.affected ?? 0) > 0;
  }
}
