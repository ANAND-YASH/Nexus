import {
  type AnalysisEntity,
  ContextEntityType,
  RelationshipType,
} from '@nexus/types';
import { normalizeEntityName } from '../entities/entity-name';
import {
  EVIDENCE_MAX_LENGTH,
  type RelationshipCandidate,
} from './relationship-candidate';

/**
 * The analysis gives no per-entity confidence; extraction-based mentions get
 * this fixed, conservative value (below the 1.0 of user assertions).
 */
export const ANALYSIS_MENTION_CONFIDENCE = 0.8;
export const MAX_CANDIDATES_PER_DOCUMENT = 50;

/**
 * Free-form analysis entity types → context entity types. Conservative:
 * anything not listed is skipped rather than guessed.
 */
const TYPE_SYNONYMS: Record<string, ContextEntityType> = {
  person: 'PERSON',
  people: 'PERSON',
  individual: 'PERSON',
  organization: 'ORGANIZATION',
  organisation: 'ORGANIZATION',
  company: 'ORGANIZATION',
  institution: 'ORGANIZATION',
  agency: 'ORGANIZATION',
  team: 'ORGANIZATION',
  project: 'PROJECT',
  technology: 'TECHNOLOGY',
  tool: 'TECHNOLOGY',
  framework: 'TECHNOLOGY',
  library: 'TECHNOLOGY',
  software: 'TECHNOLOGY',
  platform: 'TECHNOLOGY',
  'programming language': 'TECHNOLOGY',
  language: 'TECHNOLOGY',
  location: 'LOCATION',
  place: 'LOCATION',
  city: 'LOCATION',
  country: 'LOCATION',
  region: 'LOCATION',
  concept: 'CONCEPT',
  idea: 'CONCEPT',
  topic: 'CONCEPT',
};

export function mapAnalysisEntityType(type: string): ContextEntityType | null {
  const key = type.trim().toLowerCase().replace(/[_-]+/g, ' ');
  return TYPE_SYNONYMS[key] ?? null;
}

/**
 * Deterministically turns a document's (already validated) AI analysis into
 * relationship candidates: DOCUMENT —MENTIONS→ entity. The AI never supplies
 * ids here — only names and types, which are resolved later, owner-scoped.
 * Unknown types are skipped; duplicates (same type + normalized name) merge.
 */
export function candidatesFromAnalysis(
  documentId: string,
  entities: AnalysisEntity[] | null,
): RelationshipCandidate[] {
  const seen = new Set<string>();
  const candidates: RelationshipCandidate[] = [];
  for (const entity of entities ?? []) {
    const entityType = mapAnalysisEntityType(entity.type);
    const name = entity.name.trim();
    if (!entityType || !name) continue;
    const dedupe = `${entityType}|${normalizeEntityName(name)}`;
    if (seen.has(dedupe)) continue;
    seen.add(dedupe);
    candidates.push({
      source: { kind: 'resource', type: 'DOCUMENT', id: documentId },
      relationshipType: RelationshipType.MENTIONS,
      target: { kind: 'entity', name, entityType },
      confidence: ANALYSIS_MENTION_CONFIDENCE,
      sourceDocumentId: documentId,
      evidence: entity.description?.slice(0, EVIDENCE_MAX_LENGTH) ?? null,
    });
    if (candidates.length >= MAX_CANDIDATES_PER_DOCUMENT) break;
  }
  return candidates;
}
