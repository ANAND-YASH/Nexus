import { createHash } from 'node:crypto';
import {
  ContextEntityType,
  ContextResourceType,
  RelationshipType,
} from '@nexus/types';
import {
  ENTITY_NAME_MAX_LENGTH,
  normalizeEntityName,
} from '../entities/entity-name';

/** Pointer to an existing resource by id. */
export interface CandidateResourceRef {
  kind: 'resource';
  type: ContextResourceType;
  id: string;
}

/** Pointer to an entity by name — resolved (or created on accept) later. */
export interface CandidateEntityRef {
  kind: 'entity';
  name: string;
  entityType: ContextEntityType;
}

export type CandidateRef = CandidateResourceRef | CandidateEntityRef;

/**
 * A relationship proposed by AI. Always untrusted: it must pass
 * parseRelationshipCandidate() and owner-scoped resolution before anything
 * is stored, and it can only ever become an AI-sourced relationship.
 */
export interface RelationshipCandidate {
  source: CandidateRef;
  relationshipType: RelationshipType;
  target: CandidateRef;
  confidence: number;
  /** Document whose content produced the proposal (provenance). */
  sourceDocumentId: string;
  /** Short justification. Untrusted text, stored as data only. */
  evidence: string | null;
}

export class CandidateRejectedError extends Error {
  constructor(reason: string) {
    super(`Candidate rejected: ${reason}`);
    this.name = 'CandidateRejectedError';
  }
}

export const EVIDENCE_MAX_LENGTH = 300;
const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Strictly validates an untrusted candidate shape. Unknown keys, wrong types,
 * unknown enum values, out-of-range confidence, malformed ids and empty or
 * oversized names are rejected (never coerced).
 */
export function parseRelationshipCandidate(
  raw: unknown,
): RelationshipCandidate {
  const o = object(raw, 'candidate', [
    'source',
    'relationshipType',
    'target',
    'confidence',
    'sourceDocumentId',
    'evidence',
  ]);
  if (!isOneOf(o.relationshipType, Object.values(RelationshipType))) {
    reject('relationshipType is not supported');
  }
  if (
    typeof o.confidence !== 'number' ||
    !Number.isFinite(o.confidence) ||
    o.confidence < 0 ||
    o.confidence > 1
  ) {
    reject('confidence must be a number between 0 and 1');
  }
  if (
    typeof o.sourceDocumentId !== 'string' ||
    !UUID.test(o.sourceDocumentId)
  ) {
    reject('sourceDocumentId must be a UUID');
  }
  let evidence: string | null = null;
  if (o.evidence != null) {
    if (typeof o.evidence !== 'string') reject('evidence must be a string');
    evidence =
      (o.evidence as string).trim().slice(0, EVIDENCE_MAX_LENGTH) || null;
  }
  return {
    source: ref(o.source, 'source'),
    relationshipType: o.relationshipType as RelationshipType,
    target: ref(o.target, 'target'),
    confidence: o.confidence as number,
    sourceDocumentId: o.sourceDocumentId as string,
    evidence,
  };
}

function ref(raw: unknown, path: string): CandidateRef {
  const kind = (raw as { kind?: unknown } | null)?.kind;
  if (kind === 'resource') {
    const o = object(raw, path, ['kind', 'type', 'id']);
    if (!isOneOf(o.type, Object.values(ContextResourceType))) {
      reject(`${path}.type is not supported`);
    }
    if (typeof o.id !== 'string' || !UUID.test(o.id)) {
      reject(`${path}.id must be a UUID`);
    }
    return { kind, type: o.type as ContextResourceType, id: o.id as string };
  }
  if (kind === 'entity') {
    const o = object(raw, path, ['kind', 'name', 'entityType']);
    if (!isOneOf(o.entityType, Object.values(ContextEntityType))) {
      reject(`${path}.entityType is not supported`);
    }
    if (typeof o.name !== 'string') reject(`${path}.name must be a string`);
    const name = (o.name as string).trim();
    if (!name || name.length > ENTITY_NAME_MAX_LENGTH) {
      reject(`${path}.name must be 1–${ENTITY_NAME_MAX_LENGTH} characters`);
    }
    return { kind, name, entityType: o.entityType as ContextEntityType };
  }
  return reject(`${path}.kind must be "resource" or "entity"`);
}

function object(
  raw: unknown,
  path: string,
  allowed: string[],
): Record<string, unknown> {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    reject(`${path} must be an object`);
  }
  const extra = Object.keys(raw as object).filter((k) => !allowed.includes(k));
  if (extra.length > 0) reject(`${path} has unexpected fields`);
  return raw as Record<string, unknown>;
}

function isOneOf<T extends string>(value: unknown, options: T[]): value is T {
  return typeof value === 'string' && (options as string[]).includes(value);
}

function reject(reason: string): never {
  throw new CandidateRejectedError(reason);
}

/** Stable identifier for a candidate (used to accept it). */
export function candidateKey(candidate: RelationshipCandidate): string {
  const part = (r: CandidateRef) =>
    r.kind === 'resource'
      ? `r:${r.type}:${r.id.toLowerCase()}`
      : `e:${r.entityType}:${normalizeEntityName(r.name)}`;
  return createHash('sha256')
    .update(
      [
        candidate.sourceDocumentId.toLowerCase(),
        part(candidate.source),
        candidate.relationshipType,
        part(candidate.target),
      ].join('|'),
    )
    .digest('hex')
    .slice(0, 32);
}
