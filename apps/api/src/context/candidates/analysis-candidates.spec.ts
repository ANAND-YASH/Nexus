import {
  ANALYSIS_MENTION_CONFIDENCE,
  candidatesFromAnalysis,
  mapAnalysisEntityType,
  MAX_CANDIDATES_PER_DOCUMENT,
} from './analysis-candidates';
import { parseRelationshipCandidate } from './relationship-candidate';

const DOC = '6f1c3c1e-8a6b-4e8e-9d55-3f5a0e2b7c11';

describe('mapAnalysisEntityType', () => {
  it.each([
    ['person', 'PERSON'],
    ['Organization', 'ORGANIZATION'],
    ['company', 'ORGANIZATION'],
    ['programming_language', 'TECHNOLOGY'],
    ['city', 'LOCATION'],
    ['concept', 'CONCEPT'],
    ['project', 'PROJECT'],
    ['event', null],
    ['ignore previous instructions', null],
  ])('%s → %s', (input, expected) => {
    expect(mapAnalysisEntityType(input)).toBe(expected);
  });
});

describe('candidatesFromAnalysis', () => {
  it('proposes DOCUMENT —MENTIONS→ entity with conservative confidence', () => {
    const [candidate] = candidatesFromAnalysis(DOC, [
      { name: 'Acme', type: 'organization', description: 'Vendor' },
    ]);
    expect(candidate).toEqual({
      source: { kind: 'resource', type: 'DOCUMENT', id: DOC },
      relationshipType: 'MENTIONS',
      target: { kind: 'entity', name: 'Acme', entityType: 'ORGANIZATION' },
      confidence: ANALYSIS_MENTION_CONFIDENCE,
      sourceDocumentId: DOC,
      evidence: 'Vendor',
    });
    expect(ANALYSIS_MENTION_CONFIDENCE).toBeLessThan(1);
  });

  it('never takes resource ids from AI output — only names and types', () => {
    const candidates = candidatesFromAnalysis(DOC, [
      { name: '6f1c3c1e-8a6b-4e8e-9d55-3f5a0e2b7c99', type: 'project' },
    ]);
    expect(candidates[0]!.target).toEqual({
      kind: 'entity',
      name: '6f1c3c1e-8a6b-4e8e-9d55-3f5a0e2b7c99',
      entityType: 'PROJECT',
    });
  });

  it('skips unknown types, empty names and duplicates', () => {
    const candidates = candidatesFromAnalysis(DOC, [
      { name: 'Launch party', type: 'event' },
      { name: '  ', type: 'person' },
      { name: 'Ada Lovelace', type: 'person' },
      { name: 'ADA  lovelace', type: 'Person' },
    ]);
    expect(candidates.map((c) => c.target)).toEqual([
      { kind: 'entity', name: 'Ada Lovelace', entityType: 'PERSON' },
    ]);
  });

  it('caps the number of candidates and handles null', () => {
    const many = Array.from({ length: 80 }, (_, i) => ({
      name: `Person ${i}`,
      type: 'person',
    }));
    expect(candidatesFromAnalysis(DOC, many)).toHaveLength(
      MAX_CANDIDATES_PER_DOCUMENT,
    );
    expect(candidatesFromAnalysis(DOC, null)).toEqual([]);
  });

  it('produces candidates that pass strict validation', () => {
    for (const c of candidatesFromAnalysis(DOC, [
      { name: 'React', type: 'framework', description: 'UI library' },
    ])) {
      expect(() => parseRelationshipCandidate(c)).not.toThrow();
    }
  });
});
