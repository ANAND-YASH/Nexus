import { DocumentSourceType } from '@nexus/types';
import { Transform } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { IsOptionalNonNull, Trim } from '../../common/validation';

export const TITLE_MAX_LENGTH = 300;
/**
 * Keeps the worst case (all-unique tokens) well under PostgreSQL's 1 MB
 * tsvector limit for the search index. Larger texts need chunking (Phase 6).
 */
export const CONTENT_MAX_LENGTH = 200_000;
const MIME_TYPE_MAX_LENGTH = 255;
const SOURCE_URL_MAX_LENGTH = 2048;
const FILE_NAME_MAX_LENGTH = 255;
const SEARCH_MAX_LENGTH = 200;

/** RFC 6838 `type/subtype` (no parameters), after lowercasing. */
const MIME_TYPE = /^[a-z0-9][a-z0-9!#$&^_.+-]*\/[a-z0-9][a-z0-9!#$&^_.+-]*$/;
const MIME_TYPE_MESSAGE = 'mimeType must be a MIME type such as text/markdown';
/** Hex digest: MD5 (32) up to SHA-512 (128), after lowercasing. */
const CHECKSUM = /^[0-9a-f]{32,128}$/;
const CHECKSUM_MESSAGE =
  'checksum must be a hex digest (32–128 hexadecimal characters)';
/** Rejects empty and whitespace-only text without altering the content. */
const NOT_BLANK = /\S/;

const Lowercase = () =>
  Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  );

/** http(s) only, and never URLs with embedded credentials (user:pass@). */
const URL_OPTIONS = {
  protocols: ['http', 'https'],
  require_protocol: true,
  disallow_auth: true,
};

/** ownerId, id and timestamps are not accepted (unknown fields → 400). */
export class CreateDocumentDto {
  @Trim()
  @IsString()
  @IsNotEmpty()
  @MaxLength(TITLE_MAX_LENGTH)
  title: string;

  // Stored verbatim; whitespace in content is meaningful.
  @IsString()
  @Matches(NOT_BLANK, { message: 'content must not be empty' })
  @MaxLength(CONTENT_MAX_LENGTH)
  content: string;

  @Lowercase()
  @IsString()
  @MaxLength(MIME_TYPE_MAX_LENGTH)
  @Matches(MIME_TYPE, { message: MIME_TYPE_MESSAGE })
  mimeType: string;

  @IsEnum(DocumentSourceType)
  sourceType: DocumentSourceType;

  @IsOptional()
  @Trim()
  @MaxLength(SOURCE_URL_MAX_LENGTH)
  @IsUrl(URL_OPTIONS, { message: 'sourceUrl must be an http(s) URL' })
  sourceUrl?: string | null;

  @IsOptional()
  @Trim()
  @IsString()
  @IsNotEmpty()
  @MaxLength(FILE_NAME_MAX_LENGTH)
  fileName?: string | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(Number.MAX_SAFE_INTEGER)
  fileSizeBytes?: number | null;

  @IsOptional()
  @Lowercase()
  @IsString()
  @Matches(CHECKSUM, { message: CHECKSUM_MESSAGE })
  checksum?: string | null;
}

/**
 * PATCH: omitted = unchanged; `null` clears sourceUrl, fileName,
 * fileSizeBytes and checksum. Required fields reject `null`.
 */
export class UpdateDocumentDto {
  @IsOptionalNonNull()
  @Trim()
  @IsString()
  @IsNotEmpty()
  @MaxLength(TITLE_MAX_LENGTH)
  title?: string;

  @IsOptionalNonNull()
  @IsString()
  @Matches(NOT_BLANK, { message: 'content must not be empty' })
  @MaxLength(CONTENT_MAX_LENGTH)
  content?: string;

  @IsOptionalNonNull()
  @Lowercase()
  @IsString()
  @MaxLength(MIME_TYPE_MAX_LENGTH)
  @Matches(MIME_TYPE, { message: MIME_TYPE_MESSAGE })
  mimeType?: string;

  @IsOptionalNonNull()
  @IsEnum(DocumentSourceType)
  sourceType?: DocumentSourceType;

  @IsOptional()
  @Trim()
  @MaxLength(SOURCE_URL_MAX_LENGTH)
  @IsUrl(URL_OPTIONS, { message: 'sourceUrl must be an http(s) URL' })
  sourceUrl?: string | null;

  @IsOptional()
  @Trim()
  @IsString()
  @IsNotEmpty()
  @MaxLength(FILE_NAME_MAX_LENGTH)
  fileName?: string | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(Number.MAX_SAFE_INTEGER)
  fileSizeBytes?: number | null;

  @IsOptional()
  @Lowercase()
  @IsString()
  @Matches(CHECKSUM, { message: CHECKSUM_MESSAGE })
  checksum?: string | null;
}

export class ListDocumentsQueryDto {
  @IsOptional()
  @IsEnum(DocumentSourceType)
  sourceType?: DocumentSourceType;

  @IsOptional()
  @Lowercase()
  @IsString()
  @MaxLength(MIME_TYPE_MAX_LENGTH)
  @Matches(MIME_TYPE, { message: MIME_TYPE_MESSAGE })
  mimeType?: string;

  @IsOptional()
  @Trim()
  @IsString()
  @IsNotEmpty()
  @MaxLength(SEARCH_MAX_LENGTH)
  search?: string;
}
