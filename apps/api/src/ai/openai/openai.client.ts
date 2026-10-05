import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import type { AiEnv } from '../../config/env';

export const OPENAI_CLIENT = Symbol('OPENAI_CLIENT');

/** Upper bound for one analysis request (large documents take a while). */
const REQUEST_TIMEOUT_MS = 120_000;

/**
 * The OpenAI client, or null when AI analysis is disabled. The SDK's own
 * retries are off: BullMQ owns retrying, so attempts don't multiply.
 */
export const openAiClientProvider = {
  provide: OPENAI_CLIENT,
  inject: [ConfigService],
  useFactory: (config: ConfigService<AiEnv, true>): OpenAI | null => {
    if (!config.get('AI_DOCUMENT_ANALYSIS_ENABLED', { infer: true })) {
      return null;
    }
    return new OpenAI({
      apiKey: config.get('OPENAI_API_KEY', { infer: true }) ?? undefined,
      maxRetries: 0,
      timeout: REQUEST_TIMEOUT_MS,
    });
  },
};
