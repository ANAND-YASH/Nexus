/**
 * Shared constants and fakes for context-graph unit tests. Not imported by
 * application code.
 */
import { randomUUID } from 'node:crypto';
import type { ResourceRef } from '@nexus/types';
import type { ContextRelationship } from '../relationships/context-relationship.entity';
import type {
  ContextRelationshipsStore,
  InsertResult,
  RelationshipFilter,
} from '../relationships/context-relationships.store';
import type { NewRelationship } from '../relationships/relationship-rules';

export const ALICE = '00000000-0000-4000-8000-00000000000a';
export const BOB = '00000000-0000-4000-8000-00000000000b';
export const uuid = () => randomUUID();

/**
 * In-memory relationship store with the same contract as the real one:
 * owner-scoped existence via `owned`, unique edges, owner-scoped reads.
 */
export class InMemoryRelationshipsStore implements Pick<
  ContextRelationshipsStore,
  'insert' | 'list' | 'forResource' | 'remove'
> {
  readonly rows: ContextRelationship[] = [];
  /** `${ownerId}|${type}|${id}` of resources that exist. */
  readonly owned = new Set<string>();

  own(ownerId: string, ref: ResourceRef): ResourceRef {
    this.owned.add(`${ownerId}|${ref.type}|${ref.id}`);
    return ref;
  }

  insert(ownerId: string, input: NewRelationship): Promise<InsertResult> {
    const refs = [input.source, input.target];
    if (input.sourceDocumentId) {
      refs.push({ type: 'DOCUMENT', id: input.sourceDocumentId });
    }
    const missing = refs.find(
      (r) => !this.owned.has(`${ownerId}|${r.type}|${r.id}`),
    );
    if (missing) return Promise.resolve({ kind: 'not-found', ref: missing });
    const duplicate = this.rows.some(
      (r) =>
        r.ownerId === ownerId &&
        r.sourceType === input.source.type &&
        r.sourceId === input.source.id &&
        r.relationshipType === input.relationshipType &&
        r.targetType === input.target.type &&
        r.targetId === input.target.id,
    );
    if (duplicate) return Promise.resolve({ kind: 'duplicate' });
    const now = new Date(Date.now() + this.rows.length);
    const row: ContextRelationship = {
      id: randomUUID(),
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
      createdAt: now,
      updatedAt: now,
    };
    this.rows.push(row);
    return Promise.resolve({ kind: 'created', relationship: { ...row } });
  }

  list(
    ownerId: string,
    filter: RelationshipFilter,
  ): Promise<ContextRelationship[]> {
    return Promise.resolve(
      this.rows
        .filter(
          (r) =>
            r.ownerId === ownerId &&
            Object.entries(filter).every(
              ([k, v]) => r[k as keyof ContextRelationship] === v,
            ),
        )
        .reverse(),
    );
  }

  forResource(ownerId: string, ref: ResourceRef, limit: number) {
    return Promise.resolve(
      this.rows
        .filter(
          (r) =>
            r.ownerId === ownerId &&
            ((r.sourceType === ref.type && r.sourceId === ref.id) ||
              (r.targetType === ref.type && r.targetId === ref.id)),
        )
        .reverse()
        .slice(0, limit),
    );
  }

  remove(ownerId: string, id: string): Promise<boolean> {
    const index = this.rows.findIndex(
      (r) => r.id === id && r.ownerId === ownerId,
    );
    if (index === -1) return Promise.resolve(false);
    this.rows.splice(index, 1);
    return Promise.resolve(true);
  }

  asStore(): ContextRelationshipsStore {
    return this as unknown as ContextRelationshipsStore;
  }
}
