import { randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  type DocumentAnalysisResult,
  DocumentAnalysisStatus,
} from '@nexus/types';
import { In, Repository } from 'typeorm';
import { DocumentAnalysis } from './document-analysis.entity';

export interface AnalysisRun {
  id: string;
  runId: string;
}

const CLEARED_RESULTS = {
  summary: null,
  keyPoints: null,
  topics: null,
  entities: null,
  actionItems: null,
  importantDates: null,
  error: null,
};

/**
 * Persistence for document_ai_analysis. Every write is a single atomic
 * statement; worker writes are conditional on the run still being current.
 */
@Injectable()
export class DocumentAnalysisStore {
  constructor(
    @InjectRepository(DocumentAnalysis)
    private readonly analyses: Repository<DocumentAnalysis>,
  ) {}

  findForDocument(
    ownerId: string,
    documentId: string,
  ): Promise<DocumentAnalysis | null> {
    return this.analyses.findOne({ where: { ownerId, documentId } });
  }

  /**
   * Starts a new run: inserts the analysis row, or resets the existing one,
   * in one `INSERT … ON CONFLICT DO UPDATE`. Concurrent calls can't create a
   * second row (unique (document_id, owner_id)); the last run wins.
   */
  async startRun(
    ownerId: string,
    documentId: string,
    model: string,
  ): Promise<AnalysisRun> {
    const runId = randomUUID();
    const result = await this.analyses
      .createQueryBuilder()
      .insert()
      .values({
        ownerId,
        documentId,
        model,
        runId,
        status: DocumentAnalysisStatus.PENDING,
        ...CLEARED_RESULTS,
        updatedAt: () => 'now()',
      })
      .orUpdate(
        [
          'status',
          'run_id',
          'model',
          'summary',
          'key_points',
          'topics',
          'entities',
          'action_items',
          'important_dates',
          'error',
          'updated_at',
        ],
        ['document_id', 'owner_id'],
      )
      .returning(['id'])
      .execute();
    const [row] = result.raw as { id: string }[];
    return { id: row!.id, runId };
  }

  /** Claims the run for processing (also on retries). False if superseded. */
  async markProcessing(run: AnalysisRun): Promise<boolean> {
    return this.updateRun(
      run,
      [DocumentAnalysisStatus.PENDING, DocumentAnalysisStatus.PROCESSING],
      { status: DocumentAnalysisStatus.PROCESSING },
    );
  }

  /** Stores validated results. False if the run was superseded meanwhile. */
  async complete(
    run: AnalysisRun,
    result: DocumentAnalysisResult,
  ): Promise<boolean> {
    return this.updateRun(run, [DocumentAnalysisStatus.PROCESSING], {
      status: DocumentAnalysisStatus.COMPLETED,
      ...result,
      error: null,
    });
  }

  /** Records a safe failure message. False if the run was superseded. */
  async fail(run: AnalysisRun, safeMessage: string): Promise<boolean> {
    return this.updateRun(
      run,
      [DocumentAnalysisStatus.PENDING, DocumentAnalysisStatus.PROCESSING],
      {
        status: DocumentAnalysisStatus.FAILED,
        ...CLEARED_RESULTS,
        error: safeMessage,
      },
    );
  }

  private async updateRun(
    run: AnalysisRun,
    fromStatuses: DocumentAnalysisStatus[],
    changes: Partial<DocumentAnalysis>,
  ): Promise<boolean> {
    const result = await this.analyses.update(
      { id: run.id, runId: run.runId, status: In(fromStatuses) },
      changes,
    );
    return (result.affected ?? 0) > 0;
  }
}
