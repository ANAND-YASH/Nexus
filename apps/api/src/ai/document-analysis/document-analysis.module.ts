import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Document } from '../../documents/document.entity';
import { AiModule } from '../ai.module';
import { DocumentAnalysisController } from './document-analysis.controller';
import { DocumentAnalysis } from './document-analysis.entity';
import { DocumentAnalysisProcessor } from './document-analysis.processor';
import {
  DOCUMENT_ANALYSIS_QUEUE_OPTIONS,
  defaultQueueOptions,
  DocumentAnalysisQueue,
} from './document-analysis.queue';
import { DocumentAnalysisService } from './document-analysis.service';
import { DocumentAnalysisStore } from './document-analysis.store';
import { DocumentAnalysisWorker } from './document-analysis.worker';

/**
 * Asynchronous AI analysis of documents: API (enqueue/status), BullMQ queue
 * and worker, and persistence. Reads documents through its own owner-scoped
 * repository, so DocumentsModule stays CRUD-only and unaware of AI.
 */
@Module({
  imports: [TypeOrmModule.forFeature([DocumentAnalysis, Document]), AiModule],
  controllers: [DocumentAnalysisController],
  providers: [
    { provide: DOCUMENT_ANALYSIS_QUEUE_OPTIONS, useValue: defaultQueueOptions },
    DocumentAnalysisStore,
    DocumentAnalysisQueue,
    DocumentAnalysisProcessor,
    DocumentAnalysisWorker,
    DocumentAnalysisService,
  ],
})
export class DocumentAnalysisModule {}
