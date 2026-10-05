import {
  Inject,
  Injectable,
  Logger,
  type OnModuleDestroy,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue, type ConnectionOptions, type JobsOptions } from 'bullmq';
import type { AiEnv } from '../../config/env';

export const DOCUMENT_ANALYSIS_QUEUE = 'document-analysis';

/** Identifiers only — never content, credentials or prompts. */
export interface DocumentAnalysisJobData {
  analysisId: string;
  runId: string;
  documentId: string;
  ownerId: string;
}

/** Overridable (e.g. an isolated key prefix in tests). */
export const DOCUMENT_ANALYSIS_QUEUE_OPTIONS = Symbol(
  'DOCUMENT_ANALYSIS_QUEUE_OPTIONS',
);
export interface DocumentAnalysisQueueOptions {
  /** Redis key prefix for BullMQ. */
  prefix: string;
  /** Jobs processed in parallel per API instance. */
  concurrency: number;
}
export const defaultQueueOptions: DocumentAnalysisQueueOptions = {
  prefix: 'nexus',
  concurrency: 2,
};

export const JOB_OPTIONS: JobsOptions = {
  attempts: 3,
  // 10 s, 20 s between attempts — rides out rate limits and short outages.
  backoff: { type: 'exponential', delay: 10_000 },
  // Keep a short history for debugging without growing Redis unbounded.
  removeOnComplete: { age: 24 * 3_600, count: 1_000 },
  removeOnFail: { age: 7 * 24 * 3_600, count: 5_000 },
};

/** ioredis options from REDIS_URL (BullMQ then owns and closes connections). */
export function redisConnection(url: string): ConnectionOptions {
  const parsed = new URL(url);
  const db = parsed.pathname.replace('/', '');
  return {
    host: parsed.hostname,
    port: parsed.port ? Number(parsed.port) : 6379,
    username: parsed.username ? decodeURIComponent(parsed.username) : undefined,
    password: parsed.password ? decodeURIComponent(parsed.password) : undefined,
    db: db ? Number(db) : 0,
    tls: parsed.protocol === 'rediss:' ? {} : undefined,
    // Required by BullMQ workers; fine for queues too.
    maxRetriesPerRequest: null,
  };
}

/**
 * Producer side of the document-analysis queue. Null-object when AI analysis
 * is disabled: no Redis connection is ever opened.
 */
@Injectable()
export class DocumentAnalysisQueue implements OnModuleDestroy {
  private readonly logger = new Logger(DocumentAnalysisQueue.name);
  private readonly queue: Queue<DocumentAnalysisJobData> | null;

  constructor(
    config: ConfigService<AiEnv, true>,
    @Inject(DOCUMENT_ANALYSIS_QUEUE_OPTIONS)
    options: DocumentAnalysisQueueOptions,
  ) {
    const enabled = config.get('AI_DOCUMENT_ANALYSIS_ENABLED', { infer: true });
    const url = config.get('REDIS_URL', { infer: true });
    this.queue =
      enabled && url
        ? new Queue<DocumentAnalysisJobData>(DOCUMENT_ANALYSIS_QUEUE, {
            connection: redisConnection(url),
            prefix: options.prefix,
            defaultJobOptions: JOB_OPTIONS,
          })
        : null;
    // Connection errors are retried by ioredis; log without the URL.
    this.queue?.on('error', (error) =>
      this.logger.warn(`Queue connection error: ${error.name}`),
    );
  }

  get enabled(): boolean {
    return this.queue !== null;
  }

  /** One job per run; the job id makes re-adding the same run a no-op. */
  async enqueue(data: DocumentAnalysisJobData): Promise<void> {
    if (!this.queue) throw new Error('Document analysis queue is disabled');
    await this.queue.add('analyze', data, { jobId: data.runId });
  }

  async onModuleDestroy(): Promise<void> {
    await this.queue?.close();
  }
}
