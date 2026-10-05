import { Module } from '@nestjs/common';
import { DOCUMENT_ANALYZER } from './document-analyzer';
import { OpenAiDocumentAnalyzer } from './openai/openai-document-analyzer';
import { openAiClientProvider } from './openai/openai.client';

/**
 * AI providers behind provider-neutral interfaces. Swapping or adding a
 * provider means binding DOCUMENT_ANALYZER to another implementation; callers
 * never depend on OpenAI directly.
 */
@Module({
  providers: [
    openAiClientProvider,
    { provide: DOCUMENT_ANALYZER, useClass: OpenAiDocumentAnalyzer },
  ],
  exports: [DOCUMENT_ANALYZER],
})
export class AiModule {}
