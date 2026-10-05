import type { ContextEntityResponse, ContextEntitySummary } from '@nexus/types';
import type { ContextEntity } from './context-entity.entity';

/** List shape: no description or metadata. */
export function toContextEntitySummary(
  entity: ContextEntity,
): ContextEntitySummary {
  return {
    id: entity.id,
    name: entity.name,
    type: entity.type,
    createdAt: entity.createdAt.toISOString(),
    updatedAt: entity.updatedAt.toISOString(),
  };
}

export function toContextEntityResponse(
  entity: ContextEntity,
): ContextEntityResponse {
  return {
    ...toContextEntitySummary(entity),
    description: entity.description,
    metadata: entity.metadata,
  };
}
