import type { TaskPriority } from './tasks.js';

export const DocumentAnalysisStatus = {
  PENDING: 'PENDING',
  PROCESSING: 'PROCESSING',
  COMPLETED: 'COMPLETED',
  FAILED: 'FAILED',
} as const;
export type DocumentAnalysisStatus =
  (typeof DocumentAnalysisStatus)[keyof typeof DocumentAnalysisStatus];

/** A person, organization, product, place… mentioned in the document. */
export interface AnalysisEntity {
  name: string;
  /** Free-form category, e.g. "person", "organization". */
  type: string;
  description?: string;
}

/**
 * A suggested follow-up found in the document. Insight only — NEXUS does not
 * create tasks from these. Priority reuses the task priority scale.
 */
export interface AnalysisActionItem {
  title: string;
  description?: string;
  priority?: TaskPriority;
}

export interface AnalysisImportantDate {
  /** Calendar date, `YYYY-MM-DD`. */
  date: string;
  description: string;
}

/** The structured output of one analysis run. */
export interface DocumentAnalysisResult {
  summary: string;
  keyPoints: string[];
  topics: string[];
  entities: AnalysisEntity[];
  actionItems: AnalysisActionItem[];
  importantDates: AnalysisImportantDate[];
}

/**
 * `GET /api/documents/:id/analysis` (and the 202 body of `POST …/analyze`).
 * Result fields are null until the status is COMPLETED.
 */
export interface DocumentAnalysisResponse {
  id: string;
  documentId: string;
  status: DocumentAnalysisStatus;
  /** Model used for the current run. */
  model: string;
  summary: string | null;
  keyPoints: string[] | null;
  topics: string[] | null;
  entities: AnalysisEntity[] | null;
  actionItems: AnalysisActionItem[] | null;
  importantDates: AnalysisImportantDate[] | null;
  /** User-facing reason when status is FAILED; never a raw provider error. */
  error: string | null;
  /** ISO 8601 timestamp. */
  createdAt: string;
  /** ISO 8601 timestamp. */
  updatedAt: string;
}
