import {
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  DocumentAnalysisStatus,
  type DocumentAnalysisResponse,
} from '@nexus/types';
import { Repository } from 'typeorm';
import { isForeignKeyViolation } from '../../common/errors';
import { Document } from '../../documents/document.entity';
import { documentNotFound } from '../../documents/documents.service';
import { DOCUMENT_ANALYZER, type DocumentAnalyzer } from '../document-analyzer';
import { toDocumentAnalysisResponse } from './document-analysis.mapper';
import { DocumentAnalysisQueue } from './document-analysis.queue';
import { DocumentAnalysisStore } from './document-analysis.store';

/**
 * A run still PENDING/PROCESSING and touched within this window is "in
 * flight": re-requesting returns it instead of paying for another run. Older
 * ones (e.g. a lost job) may be restarted. Exceeds attempts × backoff.
 */
export const IN_FLIGHT_WINDOW_MS = 10 * 60_000;

const ANALYSIS_DISABLED = 'AI document analysis is not enabled.';
const QUEUE_UNAVAILABLE =
  'Analysis could not be queued. Please try again later.';

/**
 * Analysis orchestration for the API: owner checks, run bookkeeping and
 * queueing. Never calls the AI provider itself — the worker does.
 */
@Injectable()
export class DocumentAnalysisService {
  private readonly logger = new Logger(DocumentAnalysisService.name);

  constructor(
    @InjectRepository(Document)
    private readonly documents: Repository<Document>,
    private readonly store: DocumentAnalysisStore,
    private readonly queue: DocumentAnalysisQueue,
    @Inject(DOCUMENT_ANALYZER) private readonly analyzer: DocumentAnalyzer,
  ) {}

  /**
   * Queues (or re-queues) analysis of an own document and returns the
   * current analysis. Returns the existing run when one is already in flight.
   * @throws NotFoundException for missing or foreign documents.
   * @throws ServiceUnavailableException when disabled or Redis is down.
   */
  async requestAnalysis(
    ownerId: string,
    documentId: string,
  ): Promise<DocumentAnalysisResponse> {
    await this.assertDocumentOwned(ownerId, documentId);
    if (!this.queue.enabled) {
      throw new ServiceUnavailableException(ANALYSIS_DISABLED);
    }

    const current = await this.store.findForDocument(ownerId, documentId);
    if (current && isInFlight(current.status, current.updatedAt)) {
      return toDocumentAnalysisResponse(current);
    }

    let run;
    try {
      run = await this.store.startRun(ownerId, documentId, this.analyzer.model);
    } catch (error) {
      // The document was deleted between the check and the insert.
      if (isForeignKeyViolation(error, 'FK_document_ai_analysis_document')) {
        throw documentNotFound();
      }
      throw error;
    }

    try {
      await this.queue.enqueue({
        analysisId: run.id,
        runId: run.runId,
        documentId,
        ownerId,
      });
    } catch (error) {
      // Don't leave the run PENDING forever if Redis is unreachable.
      await this.store.fail(run, QUEUE_UNAVAILABLE);
      this.logger.warn(
        `Analysis enqueue failed: documentId=${documentId} analysisId=${run.id} ` +
          `error=${error instanceof Error ? error.name : 'unknown'}`,
      );
      throw new ServiceUnavailableException(QUEUE_UNAVAILABLE);
    }

    this.logger.log(
      `Analysis queued: documentId=${documentId} analysisId=${run.id} status=PENDING`,
    );
    return this.getAnalysis(ownerId, documentId);
  }

  /** @throws NotFoundException for foreign/missing documents or no analysis. */
  async getAnalysis(
    ownerId: string,
    documentId: string,
  ): Promise<DocumentAnalysisResponse> {
    await this.assertDocumentOwned(ownerId, documentId);
    const analysis = await this.store.findForDocument(ownerId, documentId);
    if (!analysis) {
      throw new NotFoundException('Document has not been analyzed.');
    }
    return toDocumentAnalysisResponse(analysis);
  }

  private async assertDocumentOwned(
    ownerId: string,
    documentId: string,
  ): Promise<void> {
    if (
      !(await this.documents.exists({ where: { id: documentId, ownerId } }))
    ) {
      throw documentNotFound();
    }
  }
}

export function isInFlight(
  status: DocumentAnalysisStatus,
  updatedAt: Date,
  now = Date.now(),
): boolean {
  return (
    (status === DocumentAnalysisStatus.PENDING ||
      status === DocumentAnalysisStatus.PROCESSING) &&
    now - updatedAt.getTime() < IN_FLIGHT_WINDOW_MS
  );
}
