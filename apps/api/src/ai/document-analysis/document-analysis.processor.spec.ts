import { Logger } from '@nestjs/common';
import { DocumentSourceType } from '@nexus/types';
import { UnrecoverableError } from 'bullmq';
import type { Document } from '../../documents/document.entity';
import { InMemoryRepository } from '../../testing/in-memory-repository';
import { AnalysisError } from '../document-analyzer';
import {
  ALICE,
  BOB,
  FakeAnalyzer,
  InMemoryAnalysisStore,
  SAMPLE_RESULT,
} from '../testing/analysis-test-utils';
import { DocumentAnalysisProcessor } from './document-analysis.processor';

const FIRST = { attempt: 1, maxAttempts: 3 };
const LAST = { attempt: 3, maxAttempts: 3 };

describe('DocumentAnalysisProcessor', () => {
  let documents: InMemoryRepository<Document>;
  let store: InMemoryAnalysisStore;
  let analyzer: FakeAnalyzer;
  let processor: DocumentAnalysisProcessor;
  let logs: string[];

  beforeEach(() => {
    logs = [];
    for (const level of ['log', 'warn'] as const) {
      jest
        .spyOn(Logger.prototype, level)
        .mockImplementation((...args: unknown[]) => {
          logs.push(String(args[0]));
        });
    }
    documents = new InMemoryRepository<Document>();
    store = new InMemoryAnalysisStore();
    analyzer = new FakeAnalyzer();
    processor = new DocumentAnalysisProcessor(
      documents.asRepository(),
      store.asStore(),
      analyzer,
    );
  });

  afterEach(() => jest.restoreAllMocks());

  const queued = async (ownerId = ALICE, content = 'TOP-SECRET body') => {
    const doc = documents.seed({
      ownerId,
      title: 'Plan',
      content,
      mimeType: 'text/plain',
      sourceType: DocumentSourceType.MANUAL,
      sourceUrl: 'https://example.com/?token=SECRET-URL',
    });
    const run = await store.startRun(ownerId, doc.id, analyzer.model);
    return {
      job: {
        analysisId: run.id,
        runId: run.runId,
        documentId: doc.id,
        ownerId,
      },
      doc,
    };
  };

  it('analyzes title + content only and stores a COMPLETED result', async () => {
    const { job } = await queued();

    await expect(processor.process(job, FIRST)).resolves.toBe('completed');

    expect(analyzer.calls).toEqual([
      { title: 'Plan', content: 'TOP-SECRET body' },
    ]);
    expect(store.rows[0]).toMatchObject({
      status: 'COMPLETED',
      ...SAMPLE_RESULT,
      error: null,
    });
  });

  it('logs identifiers and status only, never content, URLs or output', async () => {
    const { job } = await queued();
    await processor.process(job, FIRST);

    const all = logs.join('\n');
    expect(all).toContain(`documentId=${job.documentId}`);
    expect(all).toContain('status=COMPLETED');
    expect(all).not.toMatch(/TOP-SECRET|SECRET-URL|launch v1/);
  });

  it('loads the document with owner scoping (no cross-user reads)', async () => {
    const { job } = await queued(BOB);

    const outcome = await processor.process({ ...job, ownerId: ALICE }, FIRST);

    // A job claiming Alice owns Bob's document finds nothing to analyze.
    expect(outcome).toBe('document-missing');
    expect(analyzer.calls).toHaveLength(0);
    expect(store.rows[0]!.summary).toBeNull();
  });

  it('skips a superseded run without calling the provider', async () => {
    const { job, doc } = await queued();
    await store.startRun(ALICE, doc.id, analyzer.model); // newer run

    await expect(processor.process(job, FIRST)).resolves.toBe('superseded');
    expect(analyzer.calls).toHaveLength(0);
    expect(store.rows[0]!.status).toBe('PENDING');
  });

  it('discards results when the run is superseded mid-analysis', async () => {
    const { job, doc } = await queued();
    analyzer.next = async () => {
      await store.startRun(ALICE, doc.id, analyzer.model);
      return SAMPLE_RESULT;
    };

    await expect(processor.process(job, FIRST)).resolves.toBe('superseded');
    expect(store.rows[0]).toMatchObject({ status: 'PENDING', summary: null });
  });

  it('is idempotent: a duplicate delivery after completion is a no-op', async () => {
    const { job } = await queued();
    await processor.process(job, FIRST);

    await expect(processor.process(job, FIRST)).resolves.toBe('superseded');
    expect(analyzer.calls).toHaveLength(1);
    expect(store.rows[0]!.status).toBe('COMPLETED');
  });

  it('handles a document deleted after queueing', async () => {
    const { job } = await queued();
    documents.rows.splice(0);

    await expect(processor.process(job, FIRST)).resolves.toBe(
      'document-missing',
    );
    expect(analyzer.calls).toHaveLength(0);
  });

  describe('failures', () => {
    it('retryable error before the last attempt: rethrows and stays PROCESSING', async () => {
      const { job } = await queued();
      const error = new AnalysisError('PROVIDER_UNAVAILABLE', true);
      analyzer.next = () => Promise.reject(error);

      await expect(processor.process(job, FIRST)).rejects.toBe(error);
      expect(store.rows[0]).toMatchObject({
        status: 'PROCESSING',
        error: null,
      });
    });

    it('a retry after a transient failure completes the same run', async () => {
      const { job } = await queued();
      analyzer.next = () =>
        Promise.reject(new AnalysisError('PROVIDER_UNAVAILABLE', true));
      await processor.process(job, FIRST).catch(() => undefined);

      analyzer.next = () => Promise.resolve(SAMPLE_RESULT);
      await expect(
        processor.process(job, { attempt: 2, maxAttempts: 3 }),
      ).resolves.toBe('completed');
      expect(store.rows).toHaveLength(1);
      expect(store.rows[0]!.status).toBe('COMPLETED');
    });

    it('retryable error on the last attempt: FAILED with a safe message', async () => {
      const { job } = await queued();
      analyzer.next = () =>
        Promise.reject(
          new AnalysisError('PROVIDER_UNAVAILABLE', true, 'OpenAI 503'),
        );

      await expect(processor.process(job, LAST)).rejects.toBeInstanceOf(
        AnalysisError,
      );
      expect(store.rows[0]).toMatchObject({
        status: 'FAILED',
        error:
          'The AI service is temporarily unavailable. Please try again later.',
        summary: null,
      });
    });

    it('non-retryable error: FAILED immediately and UnrecoverableError for BullMQ', async () => {
      const { job } = await queued();
      analyzer.next = () =>
        Promise.reject(
          new AnalysisError('PROVIDER_REJECTED', false, 'OpenAI 401'),
        );

      await expect(processor.process(job, FIRST)).rejects.toBeInstanceOf(
        UnrecoverableError,
      );
      expect(store.rows[0]).toMatchObject({
        status: 'FAILED',
        error: 'The AI service could not process this document.',
      });
    });

    it('invalid model output is retried, then fails safely', async () => {
      const { job } = await queued();
      analyzer.next = () =>
        Promise.reject(new AnalysisError('INVALID_OUTPUT', true));

      await processor.process(job, FIRST).catch(() => undefined);
      expect(store.rows[0]!.status).toBe('PROCESSING');
      await processor.process(job, LAST).catch(() => undefined);
      expect(store.rows[0]).toMatchObject({
        status: 'FAILED',
        error: 'The AI service returned an invalid analysis.',
      });
    });

    it('unexpected errors never leak their message', async () => {
      const { job } = await queued();
      analyzer.next = () =>
        Promise.reject(new Error('connect ECONNREFUSED user:pw@db SECRET'));

      await processor.process(job, LAST).catch(() => undefined);

      expect(store.rows[0]).toMatchObject({
        status: 'FAILED',
        error: 'The document could not be analyzed.',
      });
      expect(logs.join('\n')).not.toContain('SECRET');
    });
  });
});
