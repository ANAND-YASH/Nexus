import type { ConfigService } from '@nestjs/config';
import type { Job } from 'bullmq';
import type { AiEnv } from '../../config/env';
import type { DocumentAnalysisProcessor } from './document-analysis.processor';
import {
  defaultQueueOptions,
  DocumentAnalysisQueue,
  type DocumentAnalysisJobData,
  JOB_OPTIONS,
  redisConnection,
} from './document-analysis.queue';
import { DocumentAnalysisWorker } from './document-analysis.worker';

const disabled = {
  get: (key: keyof AiEnv) =>
    ({
      AI_DOCUMENT_ANALYSIS_ENABLED: false,
      REDIS_URL: 'redis://localhost:6380',
    })[key as string],
} as unknown as ConfigService<AiEnv, true>;

describe('JOB_OPTIONS', () => {
  it('retries with exponential backoff and bounded retention', () => {
    expect(JOB_OPTIONS).toMatchObject({
      attempts: 3,
      backoff: { type: 'exponential' },
      removeOnComplete: { age: expect.any(Number), count: expect.any(Number) },
      removeOnFail: { age: expect.any(Number), count: expect.any(Number) },
    });
  });
});

describe('redisConnection', () => {
  it('parses host, port, credentials, db and TLS', () => {
    expect(
      redisConnection('rediss://user:p%40ss@cache.example:6390/2'),
    ).toEqual({
      host: 'cache.example',
      port: 6390,
      username: 'user',
      password: 'p@ss',
      db: 2,
      tls: {},
      maxRetriesPerRequest: null,
    });
  });

  it('defaults port and db', () => {
    expect(redisConnection('redis://localhost')).toMatchObject({
      host: 'localhost',
      port: 6379,
      db: 0,
      tls: undefined,
    });
  });
});

describe('DocumentAnalysisQueue (disabled)', () => {
  it('opens no connection and refuses to enqueue', async () => {
    const queue = new DocumentAnalysisQueue(disabled, defaultQueueOptions);

    expect(queue.enabled).toBe(false);
    await expect(queue.enqueue({} as DocumentAnalysisJobData)).rejects.toThrow(
      'disabled',
    );
    await expect(queue.onModuleDestroy()).resolves.toBeUndefined();
  });
});

describe('DocumentAnalysisWorker', () => {
  it('does not start when disabled', async () => {
    const worker = new DocumentAnalysisWorker(
      disabled,
      {} as DocumentAnalysisProcessor,
      defaultQueueOptions,
    );
    worker.onApplicationBootstrap();
    await expect(worker.onModuleDestroy()).resolves.toBeUndefined();
  });

  it('maps BullMQ attempt counters to 1-based attempt info', async () => {
    const process = jest.fn().mockResolvedValue('completed');
    const worker = new DocumentAnalysisWorker(
      disabled,
      { process } as unknown as DocumentAnalysisProcessor,
      defaultQueueOptions,
    );
    const data = {
      analysisId: 'a',
      runId: 'r',
      documentId: 'd',
      ownerId: 'o',
    };

    await worker.handle({
      data,
      attemptsMade: 2,
      opts: { attempts: 3 },
    } as unknown as Job<DocumentAnalysisJobData>);

    expect(process).toHaveBeenCalledWith(data, { attempt: 3, maxAttempts: 3 });
  });
});
