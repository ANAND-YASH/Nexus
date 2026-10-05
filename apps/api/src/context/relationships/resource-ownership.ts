import type { ContextResourceType, ResourceRef } from '@nexus/types';
import type { EntityManager } from 'typeorm';

/**
 * Table for each resource type. Fixed, code-defined values — never derived
 * from request input — so they are safe to place in SQL.
 */
export const RESOURCE_TABLES: Record<ContextResourceType, string> = {
  DOCUMENT: 'documents',
  PROJECT: 'projects',
  TASK: 'tasks',
  GOAL: 'goals',
  ENTITY: 'context_entities',
};

/**
 * Within the caller's transaction, checks that each resource exists and is
 * the owner's, and takes a `FOR KEY SHARE` lock on it. A concurrent delete of
 * a locked row waits for the transaction, then its trigger removes any edge
 * just created — so polymorphic references can't dangle.
 *
 * @returns the first reference that is missing or not the owner's, else null.
 */
export async function lockOwnedResources(
  manager: EntityManager,
  ownerId: string,
  refs: ResourceRef[],
): Promise<ResourceRef | null> {
  for (const ref of refs) {
    const rows = (await manager.query(
      `SELECT 1 FROM "${RESOURCE_TABLES[ref.type]}" WHERE "id" = $1 AND "owner_id" = $2 FOR KEY SHARE`,
      [ref.id, ownerId],
    )) as unknown[];
    if (rows.length === 0) return ref;
  }
  return null;
}
