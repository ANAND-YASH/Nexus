import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import type { DocumentAnalysisResult } from '@nexus/types';
import type { AiEnv } from '../../config/env';
import {
  DOCUMENT_ANALYSIS_JSON_SCHEMA,
  parseDocumentAnalysis,
} from '../document-analysis/document-analysis.schema';
import {
  buildDocumentInput,
  DOCUMENT_ANALYSIS_INSTRUCTIONS,
} from '../document-analysis/prompts/document-analysis.prompt';
import {
  AnalysisError,
  type DocumentAnalysisInput,
  type DocumentAnalyzer,
} from '../document-analyzer';
import { OPENAI_CLIENT } from './openai.client';

/** Generous for the schema's clamped output, bounded for cost. */
const MAX_OUTPUT_TOKENS = 4_096;

/**
 * OpenAI implementation of DocumentAnalyzer using the Responses API with a
 * strict JSON schema. The model has no tools: its output is data that is
 * validated and stored, never executed.
 */
@Injectable()
export class OpenAiDocumentAnalyzer implements DocumentAnalyzer {
  readonly model: string;

  constructor(
    @Inject(OPENAI_CLIENT) private readonly client: OpenAI | null,
    config: ConfigService<AiEnv, true>,
  ) {
    this.model = config.get('AI_DOCUMENT_ANALYSIS_MODEL', { infer: true });
  }

  async analyze(input: DocumentAnalysisInput): Promise<DocumentAnalysisResult> {
    if (!this.client) {
      throw new AnalysisError('NOT_CONFIGURED', false);
    }

    let response: OpenAI.Responses.Response;
    try {
      response = await this.client.responses.create({
        model: this.model,
        instructions: DOCUMENT_ANALYSIS_INSTRUCTIONS,
        input: buildDocumentInput(input),
        text: {
          format: {
            type: 'json_schema',
            name: 'document_analysis',
            strict: true,
            schema: DOCUMENT_ANALYSIS_JSON_SCHEMA as unknown as Record<
              string,
              unknown
            >,
          },
        },
        max_output_tokens: MAX_OUTPUT_TOKENS,
        // Personal documents: don't retain responses on the provider side.
        store: false,
      });
    } catch (error) {
      throw classifyProviderError(error);
    }

    return parseResponse(response);
  }
}

function parseResponse(
  response: OpenAI.Responses.Response,
): DocumentAnalysisResult {
  if (response.status === 'incomplete') {
    throw new AnalysisError(
      'INVALID_OUTPUT',
      true,
      `Incomplete response: ${response.incomplete_details?.reason ?? 'unknown'}`,
    );
  }
  const refused = response.output.some(
    (item) =>
      item.type === 'message' &&
      item.content.some((part) => part.type === 'refusal'),
  );
  if (refused) {
    throw new AnalysisError('PROVIDER_REJECTED', false, 'Model refused');
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(response.output_text);
  } catch {
    throw new AnalysisError('INVALID_OUTPUT', true, 'Output is not JSON');
  }
  // Strict mode should guarantee the shape; validate anyway before storing.
  return parseDocumentAnalysis(parsed);
}

/**
 * Maps SDK errors to safe, classified errors. Only the status/code reach the
 * internal message — never the provider's text, the request or credentials.
 */
export function classifyProviderError(error: unknown): AnalysisError {
  if (error instanceof AnalysisError) return error;
  if (error instanceof OpenAI.APIConnectionError) {
    return new AnalysisError('PROVIDER_UNAVAILABLE', true, 'Connection error');
  }
  if (error instanceof OpenAI.APIError) {
    const status = error.status ?? 0;
    const detail = `OpenAI ${status}${error.code ? ` ${error.code}` : ''}`;
    if (error.code === 'context_length_exceeded') {
      return new AnalysisError('DOCUMENT_TOO_LONG', false, detail);
    }
    if (status === 408 || status === 409 || status === 429 || status >= 500) {
      return new AnalysisError('PROVIDER_UNAVAILABLE', true, detail);
    }
    // 400/401/403/404/422: bad request, credentials, permissions, model.
    return new AnalysisError('PROVIDER_REJECTED', false, detail);
  }
  return new AnalysisError('PROVIDER_UNAVAILABLE', true, 'Unexpected error');
}
