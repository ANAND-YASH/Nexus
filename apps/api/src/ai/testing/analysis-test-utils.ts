/**
 * Test doubles for document-analysis unit tests. Not imported by app code.
 */
import { randomUUID } from 'node:crypto';
import {
  type DocumentAnalysisResult,
  DocumentAnalysisStatus,
} from '@nexus/types';
import type { DocumentAnalysis } from '../document-analysis/document-analysis.entity';
import type {
  AnalysisRun,
  DocumentAnalysisStore,
} from '../document-analysis/document-analysis.store';
import type {
  DocumentAnalysisInput,
  DocumentAnalyzer,
} from '../document-analyzer';

export const ALICE = '00000000-0000-4000-8000-00000000000a';
export const BOB = '00000000-0000-4000-8000-00000000000b';

export const SAMPLE_RESULT: DocumentAnalysisResult = {
  summary: 'A plan to launch v1.',
  keyPoints: ['Launch is planned for March.'],
  topics: ['launch'],
  entities: [{ name: 'Acme', type: 'organization' }],
  actionItems: [{ title: 'Book venue', priority: 'HIGH' }],
  importantDates: [{ date: '2027-03-01', description: 'Launch' }],
};

/** Same run-guarded semantics as DocumentAnalysisStore, in memory. */
export class InMemoryAnalysisStore implements Pick<
  DocumentAnalysisStore,
  'findForDocument' | 'startRun' | 'markProcessing' | 'complete' | 'fail'
> {
  readonly rows: DocumentAnalysis[] = [];

  findForDocument(ownerId: string, documentId: string) {
    const row = this.rows.find(
      (r) => r.ownerId === ownerId && r.documentId === documentId,
    );
    return Promise.resolve(row ? { ...row } : null);
  }

  startRun(ownerId: string, documentId: string, model: string) {
    const runId = randomUUID();
    const now = new Date();
    let row = this.rows.find(
      (r) => r.ownerId === ownerId && r.documentId === documentId,
    );
    if (!row) {
      row = {
        id: randomUUID(),
        ownerId,
        documentId,
        createdAt: now,
      } as DocumentAnalysis;
      this.rows.push(row);
    }
    Object.assign(row, {
      runId,
      model,
      status: DocumentAnalysisStatus.PENDING,
      summary: null,
      keyPoints: null,
      topics: null,
      entities: null,
      actionItems: null,
      importantDates: null,
      error: null,
      updatedAt: now,
    });
    return Promise.resolve({ id: row.id, runId });
  }

  markProcessing(run: AnalysisRun) {
    return this.update(run, ['PENDING', 'PROCESSING'], {
      status: DocumentAnalysisStatus.PROCESSING,
    });
  }

  complete(run: AnalysisRun, result: DocumentAnalysisResult) {
    return this.update(run, ['PROCESSING'], {
      status: DocumentAnalysisStatus.COMPLETED,
      ...result,
      error: null,
    });
  }

  fail(run: AnalysisRun, safeMessage: string) {
    return this.update(run, ['PENDING', 'PROCESSING'], {
      status: DocumentAnalysisStatus.FAILED,
      error: safeMessage,
    });
  }

  private update(
    run: AnalysisRun,
    from: string[],
    changes: Partial<DocumentAnalysis>,
  ): Promise<boolean> {
    const row = this.rows.find(
      (r) =>
        r.id === run.id && r.runId === run.runId && from.includes(r.status),
    );
    if (!row) return Promise.resolve(false);
    Object.assign(row, changes, { updatedAt: new Date() });
    return Promise.resolve(true);
  }

  asStore(): DocumentAnalysisStore {
    return this as unknown as DocumentAnalysisStore;
  }
}

/** Analyzer double: records inputs, returns or throws what it is told. */
export class FakeAnalyzer implements DocumentAnalyzer {
  readonly model = 'test-model';
  readonly calls: DocumentAnalysisInput[] = [];
  next: () => Promise<DocumentAnalysisResult> = () =>
    Promise.resolve(SAMPLE_RESULT);

  analyze(input: DocumentAnalysisInput): Promise<DocumentAnalysisResult> {
    this.calls.push(input);
    return this.next();
  }
}
