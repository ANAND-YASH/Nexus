import { AnalysisError } from '../document-analyzer';
import {
  DOCUMENT_ANALYSIS_JSON_SCHEMA,
  isCalendarDate,
  LIMITS,
  parseDocumentAnalysis,
} from './document-analysis.schema';

const valid = {
  summary: '  A launch plan.  ',
  keyPoints: ['Launch in March', ''],
  topics: ['launch'],
  entities: [
    { name: 'Acme', type: 'organization', description: null },
    { name: 'Ada', type: 'person', description: 'Project lead' },
  ],
  actionItems: [
    { title: 'Book venue', description: null, priority: 'HIGH' },
    { title: 'Send invites', description: 'By email', priority: null },
  ],
  importantDates: [
    { date: '2027-03-01', description: 'Launch' },
    { date: '2027-02-30', description: 'Impossible' },
    { date: 'March 2027', description: 'Partial' },
  ],
};

describe('parseDocumentAnalysis', () => {
  it('normalizes valid output: trims, maps null → absent, drops bad dates', () => {
    expect(parseDocumentAnalysis(valid)).toEqual({
      summary: 'A launch plan.',
      keyPoints: ['Launch in March'],
      topics: ['launch'],
      entities: [
        { name: 'Acme', type: 'organization' },
        { name: 'Ada', type: 'person', description: 'Project lead' },
      ],
      actionItems: [
        { title: 'Book venue', priority: 'HIGH' },
        { title: 'Send invites', description: 'By email' },
      ],
      importantDates: [{ date: '2027-03-01', description: 'Launch' }],
    });
  });

  it('accepts empty lists', () => {
    expect(
      parseDocumentAnalysis({
        summary: 'Nothing actionable.',
        keyPoints: [],
        topics: [],
        entities: [],
        actionItems: [],
        importantDates: [],
      }).actionItems,
    ).toEqual([]);
  });

  it('clamps oversized output', () => {
    const result = parseDocumentAnalysis({
      ...valid,
      summary: 'x'.repeat(10_000),
      keyPoints: Array.from({ length: 100 }, (_, i) => `point ${i}`),
    });
    expect(result.summary).toHaveLength(LIMITS.summary);
    expect(result.keyPoints).toHaveLength(LIMITS.keyPoints);
  });

  it.each([
    ['not an object', 'nope'],
    ['an array', []],
    ['missing summary', { ...valid, summary: undefined }],
    ['empty summary', { ...valid, summary: '   ' }],
    ['non-array topics', { ...valid, topics: 'launch' }],
    ['non-string key point', { ...valid, keyPoints: [42] }],
    ['entity without name', { ...valid, entities: [{ type: 'x' }] }],
    [
      'unknown priority',
      { ...valid, actionItems: [{ title: 't', priority: 'CRITICAL' }] },
    ],
  ])('rejects %s with INVALID_OUTPUT', (_label, raw) => {
    const error = (() => {
      try {
        parseDocumentAnalysis(raw);
      } catch (e) {
        return e;
      }
    })();
    expect(error).toBeInstanceOf(AnalysisError);
    expect((error as AnalysisError).code).toBe('INVALID_OUTPUT');
    expect((error as AnalysisError).retryable).toBe(true);
  });

  it('never puts model text into error messages', () => {
    try {
      parseDocumentAnalysis({
        ...valid,
        keyPoints: ['ok', { secret: 'LEAK' }],
      });
    } catch (e) {
      expect((e as Error).message).not.toContain('LEAK');
      expect((e as AnalysisError).safeMessage).not.toContain('LEAK');
    }
  });
});

describe('isCalendarDate', () => {
  it.each([
    ['2028-02-29', true],
    ['2027-02-29', false],
    ['2027-13-01', false],
    ['2027-1-01', false],
    ['20270101', false],
  ])('%s → %s', (value, expected) => {
    expect(isCalendarDate(value)).toBe(expected);
  });
});

describe('DOCUMENT_ANALYSIS_JSON_SCHEMA', () => {
  // OpenAI strict mode: every object lists all properties as required and
  // forbids additional properties.
  const objects: Record<string, unknown>[] = [];
  const walk = (node: unknown) => {
    if (typeof node !== 'object' || node === null) return;
    const o = node as Record<string, unknown>;
    if (o.type === 'object') objects.push(o);
    Object.values(o).forEach(walk);
  };
  walk(DOCUMENT_ANALYSIS_JSON_SCHEMA);

  it('is strict-mode compatible', () => {
    expect(objects.length).toBeGreaterThan(1);
    for (const o of objects) {
      expect(o.additionalProperties).toBe(false);
      expect([...(o.required as string[])].sort()).toEqual(
        Object.keys(o.properties as object).sort(),
      );
    }
  });
});
