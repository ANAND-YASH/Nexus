import type { DocumentAnalysisResult } from '@nexus/types';

/** What gets analyzed: title and content only — no other document fields. */
export interface DocumentAnalysisInput {
  title: string;
  content: string;
}

/**
 * Provider-neutral document analysis. Implementations must return output that
 * has already been validated with `parseDocumentAnalysis()`, and must throw
 * `AnalysisError` (never raw provider errors) on failure.
 */
export interface DocumentAnalyzer {
  /** Model identifier recorded on each analysis run. */
  readonly model: string;
  analyze(input: DocumentAnalysisInput): Promise<DocumentAnalysisResult>;
}

export const DOCUMENT_ANALYZER = Symbol('DOCUMENT_ANALYZER');

export type AnalysisErrorCode =
  | 'PROVIDER_UNAVAILABLE'
  | 'PROVIDER_REJECTED'
  | 'DOCUMENT_TOO_LONG'
  | 'INVALID_OUTPUT'
  | 'NOT_CONFIGURED';

/** User-facing messages: safe to store and return. No provider details. */
const SAFE_MESSAGES: Record<AnalysisErrorCode, string> = {
  PROVIDER_UNAVAILABLE:
    'The AI service is temporarily unavailable. Please try again later.',
  PROVIDER_REJECTED: 'The AI service could not process this document.',
  DOCUMENT_TOO_LONG: 'The document is too long to analyze.',
  INVALID_OUTPUT: 'The AI service returned an invalid analysis.',
  NOT_CONFIGURED: 'AI document analysis is not configured.',
};

/**
 * A classified analysis failure. `message` is internal (logs only, never
 * contains content or credentials); `safeMessage` is what users see.
 */
export class AnalysisError extends Error {
  readonly safeMessage: string;

  constructor(
    readonly code: AnalysisErrorCode,
    /** Whether a later attempt could succeed (rate limits, outages…). */
    readonly retryable: boolean,
    message: string = code,
  ) {
    super(message);
    this.name = 'AnalysisError';
    this.safeMessage = SAFE_MESSAGES[code];
  }
}

/** Used for anything unexpected, so internals never reach users. */
export const UNKNOWN_FAILURE_MESSAGE = 'The document could not be analyzed.';
