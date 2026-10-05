import {
  Injectable,
  NotFoundException,
  PayloadTooLargeException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type {
  DocumentDetailResponse,
  DocumentResponse,
  DocumentSummaryResponse,
} from '@nexus/types';
import { Repository } from 'typeorm';
import { hasErrorCode, PROGRAM_LIMIT_EXCEEDED } from '../common/errors';
import { definedOnly } from '../common/validation';
import { Document, SEARCH_CONFIG, searchVectorSql } from './document.entity';
import {
  toDocumentDetail,
  toDocumentResponse,
  toDocumentSummary,
} from './document.mapper';
import type {
  CreateDocumentDto,
  ListDocumentsQueryDto,
  UpdateDocumentDto,
} from './dto/document.dto';
import { DocumentLinksStore } from './links/document-links.store';

/** Every column except `content`, for list queries. */
const SUMMARY_COLUMNS = [
  'id',
  'title',
  'mimeType',
  'sourceType',
  'sourceUrl',
  'fileName',
  'fileSizeBytes',
  'checksum',
  'createdAt',
  'updatedAt',
] as const;

/**
 * Every query is scoped by `ownerId`; another user's document is
 * indistinguishable from a missing one (404). Document content and source
 * URLs are never logged or included in error messages.
 */
@Injectable()
export class DocumentsService {
  constructor(
    @InjectRepository(Document)
    private readonly documents: Repository<Document>,
    private readonly links: DocumentLinksStore,
  ) {}

  async create(
    ownerId: string,
    dto: CreateDocumentDto,
  ): Promise<DocumentResponse> {
    const document = this.documents.create({
      ownerId,
      title: dto.title,
      content: dto.content,
      mimeType: dto.mimeType,
      sourceType: dto.sourceType,
      sourceUrl: dto.sourceUrl ?? null,
      fileName: dto.fileName ?? null,
      fileSizeBytes: dto.fileSizeBytes ?? null,
      checksum: dto.checksum ?? null,
    });
    return toDocumentResponse(await this.save(document));
  }

  /**
   * Newest first; content omitted. `search` is PostgreSQL full-text search
   * over title + content (websearch syntax: words, "phrases", -exclusions),
   * passed only as a bound parameter.
   */
  async list(
    ownerId: string,
    query: ListDocumentsQueryDto,
  ): Promise<DocumentSummaryResponse[]> {
    const qb = this.documents
      .createQueryBuilder('document')
      .select(SUMMARY_COLUMNS.map((column) => `document.${column}`))
      .where('document.ownerId = :ownerId', { ownerId });

    if (query.sourceType) {
      qb.andWhere('document.sourceType = :sourceType', {
        sourceType: query.sourceType,
      });
    }
    if (query.mimeType) {
      qb.andWhere('document.mimeType = :mimeType', {
        mimeType: query.mimeType,
      });
    }
    if (query.search) {
      qb.andWhere(
        `${searchVectorSql('"document"')} @@ websearch_to_tsquery('${SEARCH_CONFIG}', :search)`,
        { search: query.search },
      );
    }

    const documents = await qb
      .orderBy('document.createdAt', 'DESC')
      .addOrderBy('document.id', 'ASC')
      .getMany();
    return documents.map(toDocumentSummary);
  }

  async get(ownerId: string, id: string): Promise<DocumentDetailResponse> {
    const document = await this.findOwned(ownerId, id);
    return toDocumentDetail(
      document,
      await this.links.relationships(ownerId, id),
    );
  }

  async update(
    ownerId: string,
    id: string,
    dto: UpdateDocumentDto,
  ): Promise<DocumentResponse> {
    const document = await this.findOwned(ownerId, id);
    Object.assign(document, definedOnly(dto));
    return toDocumentResponse(await this.save(document));
  }

  /** Link rows go with it (ON DELETE CASCADE). */
  async remove(ownerId: string, id: string): Promise<void> {
    const result = await this.documents.delete({ id, ownerId });
    if (!result.affected) throw documentNotFound();
  }

  /** @throws NotFoundException unless the document exists and is the owner's. */
  async assertOwned(ownerId: string, id: string): Promise<void> {
    if (!(await this.documents.exists({ where: { id, ownerId } }))) {
      throw documentNotFound();
    }
  }

  private async findOwned(ownerId: string, id: string): Promise<Document> {
    const document = await this.documents.findOne({ where: { id, ownerId } });
    if (!document) throw documentNotFound();
    return document;
  }

  private async save(document: Document): Promise<Document> {
    try {
      return await this.documents.save(document);
    } catch (error) {
      // The search index can't hold this text (pathological token mix).
      if (hasErrorCode(error, PROGRAM_LIMIT_EXCEEDED)) {
        throw new PayloadTooLargeException(
          'Document content is too large to index.',
        );
      }
      throw error;
    }
  }
}

export const documentNotFound = () =>
  new NotFoundException('Document not found.');
