import {
  CandidateRejectedError,
  candidateKey,
  parseRelationshipCandidate,
} from './relationship-candidate';

const DOC = '6f1c3c1e-8a6b-4e8e-9d55-3f5a0e2b7c11';
const valid = {
  source: { kind: 'resource', type: 'DOCUMENT', id: DOC },
  relationshipType: 'MENTIONS',
  target: { kind: 'entity', name: ' Acme Corp ', entityType: 'ORGANIZATION' },
  confidence: 0.8,
  sourceDocumentId: DOC,
  evidence: 'Mentioned as a vendor.',
};

const rejected = (raw: unknown) => {
  try {
    parseRelationshipCandidate(raw);
    return null;
  } catch (error) {
    expect(error).toBeInstanceOf(CandidateRejectedError);
    return (error as Error).message;
  }
};

describe('parseRelationshipCandidate', () => {
  it('accepts and normalizes a valid candidate', () => {
    expect(parseRelationshipCandidate(valid)).toEqual({
      ...valid,
      target: { kind: 'entity', name: 'Acme Corp', entityType: 'ORGANIZATION' },
    });
  });

  it.each([
    ['not an object', 'MENTIONS'],
    ['null', null],
    ['an unexpected field (e.g. ownerId)', { ...valid, ownerId: DOC }],
    [
      'an unexpected ref field',
      { ...valid, source: { ...valid.source, ownerId: DOC } },
    ],
    [
      'an unknown relationship type',
      { ...valid, relationshipType: 'DELETE_ALL' },
    ],
    ['confidence > 1', { ...valid, confidence: 1.5 }],
    ['confidence < 0', { ...valid, confidence: -0.1 }],
    ['non-numeric confidence', { ...valid, confidence: '0.9' }],
    ['NaN confidence', { ...valid, confidence: Number.NaN }],
    ['a missing source document', { ...valid, sourceDocumentId: undefined }],
    [
      'a malformed source document id',
      { ...valid, sourceDocumentId: '../etc' },
    ],
    [
      'a malformed resource id',
      { ...valid, source: { ...valid.source, id: "1' OR 1=1" } },
    ],
    [
      'an unknown resource type',
      { ...valid, source: { ...valid.source, type: 'USER' } },
    ],
    ['an unknown ref kind', { ...valid, target: { kind: 'sql', query: 'x' } }],
    [
      'an unknown entity type',
      { ...valid, target: { ...valid.target, entityType: 'ALIEN' } },
    ],
    [
      'an empty entity name',
      { ...valid, target: { ...valid.target, name: '   ' } },
    ],
    [
      'an oversized entity name',
      { ...valid, target: { ...valid.target, name: 'x'.repeat(201) } },
    ],
    ['non-string evidence', { ...valid, evidence: { html: '<script>' } }],
  ])('rejects %s', (_label, raw) => {
    expect(rejected(raw)).not.toBeNull();
  });

  it('clamps evidence', () => {
    const parsed = parseRelationshipCandidate({
      ...valid,
      evidence: 'x'.repeat(1_000),
    });
    expect(parsed.evidence).toHaveLength(300);
  });
});

describe('candidateKey', () => {
  it('is stable across case and whitespace differences in names', () => {
    const a = parseRelationshipCandidate(valid);
    const b = parseRelationshipCandidate({
      ...valid,
      target: { ...valid.target, name: 'ACME   corp' },
      confidence: 0.3,
      evidence: null,
    });
    expect(candidateKey(a)).toBe(candidateKey(b));
    expect(candidateKey(a)).toMatch(/^[0-9a-f]{32}$/);
  });

  it('differs for different targets or types', () => {
    const a = parseRelationshipCandidate(valid);
    const b = parseRelationshipCandidate({
      ...valid,
      target: { ...valid.target, entityType: 'PROJECT' },
    });
    expect(candidateKey(a)).not.toBe(candidateKey(b));
  });
});
