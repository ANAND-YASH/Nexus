import type { DocumentSourceType } from './documents.js';
import type { GoalStatus } from './goals.js';
import type { ProjectStatus } from './projects.js';
import type { TaskPriority, TaskStatus } from './tasks.js';

export const ContextEntityType = {
  PERSON: 'PERSON',
  ORGANIZATION: 'ORGANIZATION',
  PROJECT: 'PROJECT',
  TECHNOLOGY: 'TECHNOLOGY',
  LOCATION: 'LOCATION',
  CONCEPT: 'CONCEPT',
} as const;
export type ContextEntityType =
  (typeof ContextEntityType)[keyof typeof ContextEntityType];

/** Kinds of nodes a relationship can connect. */
export const ContextResourceType = {
  DOCUMENT: 'DOCUMENT',
  PROJECT: 'PROJECT',
  TASK: 'TASK',
  GOAL: 'GOAL',
  ENTITY: 'ENTITY',
} as const;
export type ContextResourceType =
  (typeof ContextResourceType)[keyof typeof ContextResourceType];

export const RelationshipType = {
  RELATED_TO: 'RELATED_TO',
  MENTIONS: 'MENTIONS',
  SUPPORTS: 'SUPPORTS',
  DEPENDS_ON: 'DEPENDS_ON',
  BLOCKS: 'BLOCKS',
  PART_OF: 'PART_OF',
  ASSIGNED_TO: 'ASSIGNED_TO',
  CREATED_BY: 'CREATED_BY',
  USES: 'USES',
} as const;
export type RelationshipType =
  (typeof RelationshipType)[keyof typeof RelationshipType];

/** Provenance: who/what asserted the relationship. */
export const RelationshipSource = {
  USER: 'USER',
  AI: 'AI',
  SYSTEM: 'SYSTEM',
  IMPORT: 'IMPORT',
} as const;
export type RelationshipSource =
  (typeof RelationshipSource)[keyof typeof RelationshipSource];

/** A typed pointer to one of the caller's resources. */
export interface ResourceRef {
  type: ContextResourceType;
  id: string;
}

// ── Entities ────────────────────────────────────────────────

/** List item — lightweight, no description or metadata. */
export interface ContextEntitySummary {
  id: string;
  name: string;
  type: ContextEntityType;
  /** ISO 8601 timestamp. */
  createdAt: string;
  /** ISO 8601 timestamp. */
  updatedAt: string;
}

export interface ContextEntityResponse extends ContextEntitySummary {
  description: string | null;
  metadata: Record<string, unknown> | null;
}

export interface CreateContextEntityRequest {
  name: string;
  type: ContextEntityType;
  description?: string | null;
  metadata?: Record<string, unknown> | null;
}

/** Omitted fields are left unchanged; `null` clears a nullable field. */
export type UpdateContextEntityRequest = Partial<CreateContextEntityRequest>;

export interface ListContextEntitiesQuery {
  type?: ContextEntityType;
  /** Case-insensitive substring match on the entity name. */
  search?: string;
}

// ── Relationships ───────────────────────────────────────────

export interface ContextRelationshipResponse {
  id: string;
  sourceType: ContextResourceType;
  sourceId: string;
  relationshipType: RelationshipType;
  targetType: ContextResourceType;
  targetId: string;
  /** 0–1. Always 1 for USER relationships. */
  confidence: number;
  source: RelationshipSource;
  /** Document that justified the relationship (required for AI). */
  sourceDocumentId: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}

/** `POST /api/context/relationships` — always created with source USER. */
export interface CreateContextRelationshipRequest {
  sourceType: ContextResourceType;
  sourceId: string;
  relationshipType: RelationshipType;
  targetType: ContextResourceType;
  targetId: string;
  sourceDocumentId?: string | null;
  metadata?: Record<string, unknown> | null;
}

export interface ListContextRelationshipsQuery {
  sourceType?: ContextResourceType;
  sourceId?: string;
  targetType?: ContextResourceType;
  targetId?: string;
  relationshipType?: RelationshipType;
  source?: RelationshipSource;
}

// ── Context aggregation (depth 1) ───────────────────────────

export interface ContextDocumentNode {
  id: string;
  title: string;
  mimeType: string;
  sourceType: DocumentSourceType;
  createdAt: string;
  updatedAt: string;
}

export interface ContextProjectNode {
  id: string;
  name: string;
  status: ProjectStatus;
  createdAt: string;
  updatedAt: string;
}

export interface ContextTaskNode {
  id: string;
  projectId: string | null;
  title: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ContextGoalNode {
  id: string;
  title: string;
  status: GoalStatus;
  targetDate: string | null;
  createdAt: string;
  updatedAt: string;
}

export type ContextEntityNode = ContextEntitySummary;

/**
 * The focal resource of a context response, tagged with its resource type.
 * (`resourceType`, not `type`: entities already have an entity `type`.)
 */
export type ContextNode =
  | ({ resourceType: 'DOCUMENT' } & ContextDocumentNode)
  | ({ resourceType: 'PROJECT' } & ContextProjectNode)
  | ({ resourceType: 'TASK' } & ContextTaskNode)
  | ({ resourceType: 'GOAL' } & ContextGoalNode)
  | ({ resourceType: 'ENTITY' } & ContextEntityNode);

/**
 * `GET /api/context/:resourceType/:resourceId`: the resource and its direct
 * neighbours (graph relationships + built-in links such as task → project).
 */
export interface ContextResponse {
  resource: ContextNode;
  related: {
    documents: ContextDocumentNode[];
    projects: ContextProjectNode[];
    tasks: ContextTaskNode[];
    goals: ContextGoalNode[];
    entities: ContextEntityNode[];
    relationships: ContextRelationshipResponse[];
  };
  /** True when a neighbour list hit its size cap. */
  truncated: boolean;
}

// ── AI relationship candidates ──────────────────────────────

/**
 * A relationship proposed from a document's AI analysis. Computed on demand,
 * never persisted, and only stored after the user accepts it — at which point
 * the server re-derives and re-validates it.
 */
export interface RelationshipCandidateResponse {
  /** Stable identifier used to accept the candidate. */
  key: string;
  sourceType: 'DOCUMENT';
  sourceId: string;
  relationshipType: RelationshipType;
  target: {
    type: 'ENTITY';
    /** Existing entity, or null if accepting will create it. */
    entityId: string | null;
    name: string;
    entityType: ContextEntityType;
  };
  confidence: number;
  sourceDocumentId: string;
  /** Short, untrusted justification taken from the analysis. */
  evidence: string | null;
  /** True if this relationship is already stored. */
  alreadyExists: boolean;
}

export interface RelationshipCandidatesResponse {
  documentId: string;
  /** Status of the document's AI analysis, or null if never analyzed. */
  analysisStatus: string | null;
  candidates: RelationshipCandidateResponse[];
}
