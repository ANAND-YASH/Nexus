import type { DocumentAnalysisResponse } from '@nexus/types';
import type { DocumentAnalysis } from './document-analysis.entity';

/** Public shape: no owner or run identifiers. */
export function toDocumentAnalysisResponse(
  analysis: DocumentAnalysis,
): DocumentAnalysisResponse {
  return {
    id: analysis.id,
    documentId: analysis.documentId,
    status: analysis.status,
    model: analysis.model,
    summary: analysis.summary,
    keyPoints: analysis.keyPoints,
    topics: analysis.topics,
    entities: analysis.entities,
    actionItems: analysis.actionItems,
    importantDates: analysis.importantDates,
    error: analysis.error,
    createdAt: analysis.createdAt.toISOString(),
    updatedAt: analysis.updatedAt.toISOString(),
  };
}
