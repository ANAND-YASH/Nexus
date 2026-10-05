import type { ContextRelationshipResponse } from '@nexus/types';
import type { ContextRelationship } from './context-relationship.entity';

/** Public shape: no owner id. */
export function toContextRelationshipResponse(
  relationship: ContextRelationship,
): ContextRelationshipResponse {
  return {
    id: relationship.id,
    sourceType: relationship.sourceType,
    sourceId: relationship.sourceId,
    relationshipType: relationship.relationshipType,
    targetType: relationship.targetType,
    targetId: relationship.targetId,
    confidence: relationship.confidence,
    source: relationship.source,
    sourceDocumentId: relationship.sourceDocumentId,
    metadata: relationship.metadata,
    createdAt: relationship.createdAt.toISOString(),
    updatedAt: relationship.updatedAt.toISOString(),
  };
}
