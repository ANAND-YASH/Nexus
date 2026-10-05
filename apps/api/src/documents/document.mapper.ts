import type {
  DocumentDetailResponse,
  DocumentRelationshipsResponse,
  DocumentResponse,
  DocumentSummaryResponse,
} from '@nexus/types';
import type { Document } from './document.entity';

/** Metadata only — used for lists, where content would be too heavy. */
export function toDocumentSummary(document: Document): DocumentSummaryResponse {
  return {
    id: document.id,
    title: document.title,
    mimeType: document.mimeType,
    sourceType: document.sourceType,
    sourceUrl: document.sourceUrl,
    fileName: document.fileName,
    fileSizeBytes: document.fileSizeBytes,
    checksum: document.checksum,
    createdAt: document.createdAt.toISOString(),
    updatedAt: document.updatedAt.toISOString(),
  };
}

export function toDocumentResponse(document: Document): DocumentResponse {
  return { ...toDocumentSummary(document), content: document.content };
}

export function toDocumentDetail(
  document: Document,
  relationships: DocumentRelationshipsResponse,
): DocumentDetailResponse {
  return { ...toDocumentResponse(document), ...relationships };
}
