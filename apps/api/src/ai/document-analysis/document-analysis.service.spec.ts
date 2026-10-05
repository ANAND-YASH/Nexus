import {
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { DocumentSourceType } from '@nexus/types';
import type { Document } from '../../documents/document.entity';
import { InMemoryRepository } from '../../testing/in-memory-repository';
import {
  ALICE,
  BOB,
  FakeAnalyzer,
  InMemoryAnalysisStore,
} from '../testing/analysis-test-utils';
import type {
  DocumentAnalysisJobData,
  DocumentAnalysisQueue,
} from './document-analysis.queue';
import {
  DocumentAnalysisService,
  IN_FLIGHT_WINDOW_MS,
  isInFlight,
} from './document-analysis.service';

class FakeQueue {
  enabled = true;
  readonly jobs: DocumentAnalysisJobData[] = [];
  fail = false;

  enqueue(data: DocumentAnalysisJobData): Promise<void> {
    if (this.fail) return Promise.reject(new Error('ECONNREFUSED'));
    this.jobs.push(data);
    return Promise.resolve();
  }
}

describe('DocumentAnalysisService', () => {
  let documents: InMemoryRepository<Document>;
  let store: InMemoryAnalysisStore;
  let queue: FakeQueue;
  let analyzer: FakeAnalyzer;
  let service: DocumentAnalysisService;

  beforeEach(() => {
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    documents = new InMemoryRepository<Document>();
    store = new InMemoryAnalysisStore();
    queue = new FakeQueue();
    analyzer = new FakeAnalyzer();
    service = new DocumentAnalysisService(
      documents.asRepository(),
      store.asStore(),
      queue as unknown as DocumentAnalysisQueue,
      analyzer,
    );
  });

  afterEach(() => jest.restoreAllMocks());

  const doc = (ownerId = ALICE) =>
    documents.seed({
      ownerId,
      title: 'Plan',
      content: 'Body',
      mimeType: 'text/plain',
      sourceType: DocumentSourceType.MANUAL,
    }).id;

  const settle = (status: 'COMPLETED' | 'FAILED') => {
    Object.assign(store.rows[0]!, { status });
  };

  describe('requestAnalysis', () => {
    it('creates a PENDING analysis and enqueues identifiers only', async () => {
      const documentId = doc();

      const analysis = await service.requestAnalysis(ALICE, documentId);

      expect(analysis).toMatchObject({
        documentId,
        status: 'PENDING',
        model: 'test-model',
        summary: null,
      });
      expect(analysis).not.toHaveProperty('runId');
      expect(analysis).not.toHaveProperty('ownerId');
      expect(queue.jobs).toEqual([
        {
          analysisId: analysis.id,
          runId: store.rows[0]!.runId,
          documentId,
          ownerId: ALICE,
        },
      ]);
      // Never synchronously calls the provider.
      expect(analyzer.calls).toHaveLength(0);
    });

    it("rejects another user's document with the safe 404", async () => {
      const foreign = doc(BOB);

      await expect(service.requestAnalysis(ALICE, foreign)).rejects.toThrow(
        new NotFoundException('Document not found.'),
      );
      expect(queue.jobs).toHaveLength(0);
      expect(store.rows).toHaveLength(0);
    });

    it('rejects a missing document with the same 404', async () => {
      await expect(
        service.requestAnalysis(ALICE, crypto.randomUUID()),
      ).rejects.toThrow('Document not found.');
    });

    it('returns 503 when analysis is disabled', async () => {
      queue.enabled = false;
      await expect(service.requestAnalysis(ALICE, doc())).rejects.toThrow(
        ServiceUnavailableException,
      );
      expect(store.rows).toHaveLength(0);
    });

    it('returns the in-flight run instead of queueing a duplicate', async () => {
      const documentId = doc();
      const first = await service.requestAnalysis(ALICE, documentId);

      const second = await service.requestAnalysis(ALICE, documentId);

      expect(second.id).toBe(first.id);
      expect(queue.jobs).toHaveLength(1);
    });

    it.each(['COMPLETED', 'FAILED'] as const)(
      're-analysis after %s resets the same row with a new run',
      async (status) => {
        const documentId = doc();
        const first = await service.requestAnalysis(ALICE, documentId);
        settle(status);
        const firstRun = store.rows[0]!.runId;

        const again = await service.requestAnalysis(ALICE, documentId);

        expect(again).toMatchObject({
          id: first.id,
          status: 'PENDING',
          error: null,
        });
        expect(store.rows).toHaveLength(1);
        expect(queue.jobs).toHaveLength(2);
        expect(queue.jobs[1]!.runId).not.toBe(firstRun);
      },
    );

    it('restarts a stale in-flight run (e.g. a lost job)', async () => {
      const documentId = doc();
      await service.requestAnalysis(ALICE, documentId);
      store.rows[0]!.updatedAt = new Date(Date.now() - IN_FLIGHT_WINDOW_MS - 1);

      await service.requestAnalysis(ALICE, documentId);

      expect(queue.jobs).toHaveLength(2);
    });

    it('marks the run FAILED and returns 503 when the queue is unreachable', async () => {
      queue.fail = true;
      const documentId = doc();

      await expect(service.requestAnalysis(ALICE, documentId)).rejects.toThrow(
        new ServiceUnavailableException(
          'Analysis could not be queued. Please try again later.',
        ),
      );
      expect(store.rows[0]).toMatchObject({ status: 'FAILED' });
    });
  });

  describe('getAnalysis', () => {
    it('returns the current analysis', async () => {
      const documentId = doc();
      const queued = await service.requestAnalysis(ALICE, documentId);

      await expect(service.getAnalysis(ALICE, documentId)).resolves.toEqual(
        queued,
      );
    });

    it('404s when the document was never analyzed', async () => {
      await expect(service.getAnalysis(ALICE, doc())).rejects.toThrow(
        new NotFoundException('Document has not been analyzed.'),
      );
    });

    it("never returns another user's analysis", async () => {
      const bobsDoc = doc(BOB);
      await store.startRun(BOB, bobsDoc, 'm');

      await expect(service.getAnalysis(ALICE, bobsDoc)).rejects.toThrow(
        new NotFoundException('Document not found.'),
      );
    });
  });
});

describe('isInFlight', () => {
  const now = Date.now();
  it.each([
    ['PENDING', 0, true],
    ['PROCESSING', IN_FLIGHT_WINDOW_MS - 1, true],
    ['PROCESSING', IN_FLIGHT_WINDOW_MS + 1, false],
    ['COMPLETED', 0, false],
    ['FAILED', 0, false],
  ] as const)('%s, age %ims → %s', (status, age, expected) => {
    expect(isInFlight(status, new Date(now - age), now)).toBe(expected);
  });
});
