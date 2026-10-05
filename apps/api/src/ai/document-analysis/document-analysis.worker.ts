import {
  Inject,
  Injectable,
  Logger,
  type OnApplicationBootstrap,
  type OnModuleDestroy,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { type Job, Worker } from 'bullmq';
import type { AiEnv } from '../../config/env';
import { DocumentAnalysisProcessor } from './document-analysis.processor';
import {
  DOCUMENT_ANALYSIS_QUEUE,
  DOCUMENT_ANALYSIS_QUEUE_OPTIONS,
  type DocumentAnalysisJobData,
  type DocumentAnalysisQueueOptions,
  JOB_OPTIONS,
  redisConnection,
} from './document-analysis.queue';

/**
 * Runs the BullMQ worker inside the API process when AI analysis is enabled.
 * Started after the app has bootstrapped; closed on shutdown (waits for
 * in-flight jobs, then releases its Redis connections).
 */
@Injectable()
export class DocumentAnalysisWorker
  implements OnApplicationBootstrap, OnModuleDestroy
{
  private readonly logger = new Logger(DocumentAnalysisWorker.name);
  private worker: Worker<DocumentAnalysisJobData> | null = null;

  constructor(
    private readonly config: ConfigService<AiEnv, true>,
    private readonly processor: DocumentAnalysisProcessor,
    @Inject(DOCUMENT_ANALYSIS_QUEUE_OPTIONS)
    private readonly options: DocumentAnalysisQueueOptions,
  ) {}

  onApplicationBootstrap(): void {
    const enabled = this.config.get('AI_DOCUMENT_ANALYSIS_ENABLED', {
      infer: true,
    });
    const url = this.config.get('REDIS_URL', { infer: true });
    if (!enabled || !url) return;

    this.worker = new Worker<DocumentAnalysisJobData>(
      DOCUMENT_ANALYSIS_QUEUE,
      (job) => this.handle(job),
      {
        connection: redisConnection(url),
        prefix: this.options.prefix,
        concurrency: this.options.concurrency,
      },
    );
    this.worker.on('error', (error) =>
      this.logger.warn(`Worker connection error: ${error.name}`),
    );
    this.logger.log('Document analysis worker started');
  }

  /** Exposed for tests; BullMQ calls it for each job. */
  handle(job: Job<DocumentAnalysisJobData>) {
    return this.processor.process(job.data, {
      attempt: job.attemptsMade + 1,
      maxAttempts: job.opts.attempts ?? JOB_OPTIONS.attempts ?? 1,
    });
  }

  async onModuleDestroy(): Promise<void> {
    await this.worker?.close();
  }
}
