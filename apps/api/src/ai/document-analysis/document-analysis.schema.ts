import {
  type AnalysisActionItem,
  type AnalysisEntity,
  type AnalysisImportantDate,
  type DocumentAnalysisResult,
  TaskPriority,
} from '@nexus/types';
import { AnalysisError } from '../document-analyzer';

const PRIORITIES = Object.values(TaskPriority);

/**
 * JSON Schema for OpenAI strict structured outputs. Strict mode requires every
 * property to be listed in `required` and `additionalProperties: false`, so
 * optional fields are expressed as nullable instead.
 */
export const DOCUMENT_ANALYSIS_JSON_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: [
    'summary',
    'keyPoints',
    'topics',
    'entities',
    'actionItems',
    'importantDates',
  ],
  properties: {
    summary: { type: 'string' },
    keyPoints: { type: 'array', items: { type: 'string' } },
    topics: { type: 'array', items: { type: 'string' } },
    entities: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['name', 'type', 'description'],
        properties: {
          name: { type: 'string' },
          type: { type: 'string' },
          description: { type: ['string', 'null'] },
        },
      },
    },
    actionItems: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['title', 'description', 'priority'],
        properties: {
          title: { type: 'string' },
          description: { type: ['string', 'null'] },
          priority: {
            anyOf: [{ type: 'string', enum: PRIORITIES }, { type: 'null' }],
          },
        },
      },
    },
    importantDates: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['date', 'description'],
        properties: {
          date: { type: 'string', description: 'YYYY-MM-DD' },
          description: { type: 'string' },
        },
      },
    },
  },
} as const;

/** Storage limits: model output is clamped, never trusted to be small. */
export const LIMITS = {
  summary: 2_000,
  text: 500,
  shortText: 200,
  keyPoints: 20,
  topics: 20,
  entities: 50,
  actionItems: 30,
  importantDates: 30,
} as const;

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

/**
 * Validates untrusted model output against the expected shape and normalizes
 * it: trims strings, clamps lengths and counts, drops empty strings and
 * impossible dates (e.g. 2026-02-30). Any structural mismatch throws
 * AnalysisError('INVALID_OUTPUT') — nothing unvalidated is ever persisted.
 */
export function parseDocumentAnalysis(raw: unknown): DocumentAnalysisResult {
  const root = asObject(raw, 'root');
  const summary = clamp(asString(root.summary, 'summary'), LIMITS.summary);
  if (summary === '') throw invalid('summary is empty');

  return {
    summary,
    keyPoints: stringList(
      root.keyPoints,
      'keyPoints',
      LIMITS.keyPoints,
      LIMITS.text,
    ),
    topics: stringList(root.topics, 'topics', LIMITS.topics, LIMITS.shortText),
    entities: asArray(root.entities, 'entities')
      .map((item, i) => entity(item, `entities[${i}]`))
      .filter((e): e is AnalysisEntity => e !== null)
      .slice(0, LIMITS.entities),
    actionItems: asArray(root.actionItems, 'actionItems')
      .map((item, i) => actionItem(item, `actionItems[${i}]`))
      .filter((a): a is AnalysisActionItem => a !== null)
      .slice(0, LIMITS.actionItems),
    importantDates: asArray(root.importantDates, 'importantDates')
      .map((item, i) => importantDate(item, `importantDates[${i}]`))
      .filter((d): d is AnalysisImportantDate => d !== null)
      .slice(0, LIMITS.importantDates),
  };
}

function entity(raw: unknown, path: string): AnalysisEntity | null {
  const o = asObject(raw, path);
  const name = clamp(asString(o.name, `${path}.name`), LIMITS.shortText);
  const type = clamp(asString(o.type, `${path}.type`), LIMITS.shortText);
  if (!name || !type) return null;
  const description = optionalText(o.description, `${path}.description`);
  return description ? { name, type, description } : { name, type };
}

function actionItem(raw: unknown, path: string): AnalysisActionItem | null {
  const o = asObject(raw, path);
  const title = clamp(asString(o.title, `${path}.title`), LIMITS.text);
  if (!title) return null;
  const item: AnalysisActionItem = { title };
  const description = optionalText(o.description, `${path}.description`);
  if (description) item.description = description;
  if (o.priority != null) {
    if (!PRIORITIES.includes(o.priority as TaskPriority)) {
      throw invalid(`${path}.priority is not a known priority`);
    }
    item.priority = o.priority as TaskPriority;
  }
  return item;
}

function importantDate(
  raw: unknown,
  path: string,
): AnalysisImportantDate | null {
  const o = asObject(raw, path);
  const date = asString(o.date, `${path}.date`).trim();
  const description = clamp(
    asString(o.description, `${path}.description`),
    LIMITS.text,
  );
  // Never keep a date we can't trust; the rest of the analysis is still valid.
  if (!isCalendarDate(date) || !description) return null;
  return { date, description };
}

export function isCalendarDate(value: string): boolean {
  const match = ISO_DATE.exec(value);
  if (!match) return false;
  const [, y, m, d] = match.map(Number) as [number, number, number, number];
  const date = new Date(Date.UTC(y, m - 1, d));
  return (
    date.getUTCFullYear() === y &&
    date.getUTCMonth() === m - 1 &&
    date.getUTCDate() === d
  );
}

function stringList(
  raw: unknown,
  path: string,
  maxItems: number,
  maxLength: number,
): string[] {
  return asArray(raw, path)
    .map((item, i) => clamp(asString(item, `${path}[${i}]`), maxLength))
    .filter((item) => item !== '')
    .slice(0, maxItems);
}

function optionalText(raw: unknown, path: string): string | undefined {
  if (raw == null) return undefined;
  return clamp(asString(raw, path), LIMITS.text) || undefined;
}

function asObject(raw: unknown, path: string): Record<string, unknown> {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    throw invalid(`${path} is not an object`);
  }
  return raw as Record<string, unknown>;
}

function asArray(raw: unknown, path: string): unknown[] {
  if (!Array.isArray(raw)) throw invalid(`${path} is not an array`);
  return raw;
}

function asString(raw: unknown, path: string): string {
  if (typeof raw !== 'string') throw invalid(`${path} is not a string`);
  return raw;
}

function clamp(value: string, max: number): string {
  return value.trim().slice(0, max).trim();
}

/** The message names the failing path only — never the model's text. */
function invalid(reason: string): AnalysisError {
  return new AnalysisError('INVALID_OUTPUT', true, `Invalid output: ${reason}`);
}
