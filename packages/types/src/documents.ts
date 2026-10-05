export const DocumentSourceType = {
  MANUAL: 'MANUAL',
  UPLOAD: 'UPLOAD',
  IMPORT: 'IMPORT',
  URL: 'URL',
} as const;
export type DocumentSourceType =
  (typeof DocumentSourceType)[keyof typeof DocumentSourceType];

/** Document metadata — what `GET /api/documents` returns per item. */
export interface DocumentSummaryResponse {
  id: string;
  title: string;
  mimeType: string;
  sourceType: DocumentSourceType;
  sourceUrl: string | null;
  fileName: string | null;
  fileSizeBytes: number | null;
  /** Lowercase hex digest, as supplied by the client. */
  checksum: string | null;
  /** ISO 8601 timestamp. */
  createdAt: string;
  /** ISO 8601 timestamp. */
  updatedAt: string;
}

/** Full document, returned by create and update. */
export interface DocumentResponse extends DocumentSummaryResponse {
  content: string;
}

/** Ids of the caller's records the document is linked to. */
export interface DocumentRelationshipsResponse {
  projectIds: string[];
  taskIds: string[];
  goalIds: string[];
}

/** `GET /api/documents/:id`: the document plus its relationships. */
export type DocumentDetailResponse = DocumentResponse &
  DocumentRelationshipsResponse;

export interface CreateDocumentRequest {
  title: string;
  content: string;
  /** `type/subtype`, e.g. `text/markdown`. Stored lowercase. */
  mimeType: string;
  sourceType: DocumentSourceType;
  sourceUrl?: string | null;
  fileName?: string | null;
  fileSizeBytes?: number | null;
  /** Hex digest (32–128 hex chars), e.g. a SHA-256. Metadata only. */
  checksum?: string | null;
}

/** Omitted fields are left unchanged; `null` clears a nullable field. */
export type UpdateDocumentRequest = Partial<CreateDocumentRequest>;

export interface ListDocumentsQuery {
  sourceType?: DocumentSourceType;
  mimeType?: string;
  /** Full-text search over title and content. */
  search?: string;
}
