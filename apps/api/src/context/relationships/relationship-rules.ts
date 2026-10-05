import { BadRequestException } from '@nestjs/common';
import {
  ContextResourceType,
  RelationshipSource,
  RelationshipType,
  type ResourceRef,
} from '@nexus/types';

const RESOURCE_TYPES = Object.values(ContextResourceType);
const RELATIONSHIP_TYPES = Object.values(RelationshipType);
const SOURCES = Object.values(RelationshipSource);
const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** A relationship ready to be validated and stored (owner comes separately). */
export interface NewRelationship {
  source: ResourceRef;
  relationshipType: RelationshipType;
  target: ResourceRef;
  provenance: RelationshipSource;
  confidence: number;
  sourceDocumentId: string | null;
  metadata: Record<string, unknown> | null;
}

/**
 * Deliberately small compatibility table. Anything not listed is allowed
 * between any two resource types.
 */
const ENDPOINT_RULES: Partial<
  Record<
    RelationshipType,
    { source?: ContextResourceType[]; target?: ContextResourceType[] }
  >
> = {
  // Only documents mention things.
  MENTIONS: { source: ['DOCUMENT'] },
  // Something is assigned to / created by a person or organization entity.
  ASSIGNED_TO: { target: ['ENTITY'] },
  CREATED_BY: { target: ['ENTITY'] },
};

/**
 * Pure, synchronous checks on a relationship (no database access). Ownership
 * and existence are checked separately, under lock, at insert time.
 *
 * Self-relationship policy: a resource can't relate to itself (same type and
 * id). Two different resources of the same type may relate.
 *
 * @throws BadRequestException describing the first violation.
 */
export function assertValidRelationship(input: NewRelationship): void {
  const fail = (message: string): never => {
    throw new BadRequestException(message);
  };

  for (const [label, ref] of [
    ['source', input.source],
    ['target', input.target],
  ] as const) {
    if (!RESOURCE_TYPES.includes(ref.type)) fail(`Unsupported ${label} type.`);
    if (!UUID.test(ref.id)) fail(`Invalid ${label} id.`);
  }
  if (!RELATIONSHIP_TYPES.includes(input.relationshipType)) {
    fail('Unsupported relationship type.');
  }
  if (!SOURCES.includes(input.provenance)) {
    fail('Unsupported relationship source.');
  }
  if (
    input.source.type === input.target.type &&
    input.source.id.toLowerCase() === input.target.id.toLowerCase()
  ) {
    fail('A resource cannot have a relationship with itself.');
  }

  const rule = ENDPOINT_RULES[input.relationshipType];
  if (rule?.source && !rule.source.includes(input.source.type)) {
    fail(
      `${input.relationshipType} requires a source of type ${rule.source.join(' or ')}.`,
    );
  }
  if (rule?.target && !rule.target.includes(input.target.type)) {
    fail(
      `${input.relationshipType} requires a target of type ${rule.target.join(' or ')}.`,
    );
  }

  if (
    typeof input.confidence !== 'number' ||
    !Number.isFinite(input.confidence) ||
    input.confidence < 0 ||
    input.confidence > 1
  ) {
    fail('Confidence must be between 0 and 1.');
  }
  // Provenance rules (also enforced by CHECK constraints in the database).
  if (input.provenance === 'USER' && input.confidence !== 1) {
    fail('USER relationships always have confidence 1.');
  }
  if (input.provenance === 'AI' && !input.sourceDocumentId) {
    fail('AI relationships require a source document.');
  }
  if (input.sourceDocumentId !== null && !UUID.test(input.sourceDocumentId)) {
    fail('Invalid source document id.');
  }
}
