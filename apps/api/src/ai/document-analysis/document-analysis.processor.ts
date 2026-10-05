import { Inject, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { UnrecoverableError } from 'bullmq';
import { Repository } from 'typeorm';
import { Document } from '../../documents/document.entity';
import {
  AnalysisError,
  DOCUMENT_ANALYZER,
  type DocumentAnalyzer,
  UNKNOWN_FAILURE_MESSAGE,
} from '../document-analyzer';
import type { DocumentAnalysisJobData } from './document-analysis.queue';
import { DocumentAnalysisStore } from './document-analysis.store';

export interface AttemptInfo {
  /** 1-based number of this attempt. */
  attempt: number;
  maxAttempts: number;
}

export type ProcessOutcome = 'completed' | 'superseded' | 'document-missing';

/**
 * Processes one analysis job. Idempotent: every state change is conditional
 * on the job's run still being current, so retries, duplicate deliveries and
 * superseded runs never corrupt the analysis row.
 *
 * Logs carry identifiers and status only — never content, prompts or output.
 */
@Injectable()
export class DocumentAnalysisProcessor {
  private readonly logger = new Logger(DocumentAnalysisProcessor.name);

  constructor(
    @InjectRepository(Document)
    private readonly documents: Repository<Document>,
    private readonly store: DocumentAnalysisStore,
    @Inject(DOCUMENT_ANALYZER) private readonly analyzer: DocumentAnalyzer,
  ) {}

  async process(
    job: DocumentAnalysisJobData,
    { attempt, maxAttempts }: AttemptInfo,
  ): Promise<ProcessOutcome> {
    const run = { id: job.analysisId, runId: job.runId };
    const ids = `documentId=${job.documentId} analysisId=${job.analysisId}`;

    if (!(await this.store.markProcessing(run))) {
      this.logger.log(`Analysis superseded, skipping: ${ids}`);
      return 'superseded';
    }
    this.logger.log(
      `Analysis started: ${ids} status=PROCESSING attempt=${attempt}/${maxAttempts}`,
    );

    // Owner-scoped load; title and content only.
    const document = await this.documents.findOne({
      where: { id: job.documentId, ownerId: job.ownerId },
      select: { id: true, title: true, content: true },
    });
    if (!document) {
      // Deleted after queueing; its analysis row was deleted with it.
      this.logger.log(`Document gone, skipping: ${ids}`);
      return 'document-missing';
    }

    const startedAt = Date.now();
    try {
      const result = await this.analyzer.analyze({
        title: document.title,
        content: document.content,
      });
      if (!(await this.store.complete(run, result))) {
        this.logger.log(`Analysis superseded during processing: ${ids}`);
        return 'superseded';
      }
      this.logger.log(
        `Analysis completed: ${ids} status=COMPLETED durationMs=${Date.now() - startedAt}`,
      );
      return 'completed';
    } catch (error) {
      const failure =
        error instanceof AnalysisError
          ? error
          : new AnalysisError(
              'PROVIDER_UNAVAILABLE',
              true,
              `Unexpected ${error instanceof Error ? error.name : 'error'}`,
            );
      const final = !failure.retryable || attempt >= maxAttempts;

      this.logger.warn(
        `Analysis attempt failed: ${ids} code=${failure.code} ` +
          `reason="${failure.message}" attempt=${attempt}/${maxAttempts} final=${final}`,
      );
      if (final) {
        await this.store.fail(
          run,
          error instanceof AnalysisError
            ? failure.safeMessage
            : UNKNOWN_FAILURE_MESSAGE,
        );
        this.logger.warn(
          `Analysis failed: ${ids} status=FAILED code=${failure.code}`,
        );
      }
      // Non-retryable errors must not be retried by BullMQ.
      throw failure.retryable ? failure : new UnrecoverableError(failure.code);
    }
  }
}
