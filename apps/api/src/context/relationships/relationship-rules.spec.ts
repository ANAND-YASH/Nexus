import { BadRequestException } from '@nestjs/common';
import {
  assertValidRelationship,
  type NewRelationship,
} from './relationship-rules';

const A = '6f1c3c1e-8a6b-4e8e-9d55-3f5a0e2b7c11';
const B = '7a2d4d2f-9b7c-4f9f-8e66-4a6b1f3c8d22';
const DOC = '8b3e5e3a-ac8d-4a0a-9f77-5b7c2a4d9e33';

const base: NewRelationship = {
  source: { type: 'PROJECT', id: A },
  relationshipType: 'RELATED_TO',
  target: { type: 'GOAL', id: B },
  provenance: 'USER',
  confidence: 1,
  sourceDocumentId: null,
  metadata: null,
};

const errorFor = (patch: Partial<NewRelationship>) => {
  try {
    assertValidRelationship({ ...base, ...patch });
    return null;
  } catch (error) {
    expect(error).toBeInstanceOf(BadRequestException);
    return (error as Error).message;
  }
};

describe('assertValidRelationship', () => {
  it('accepts a valid USER relationship', () => {
    expect(errorFor({})).toBeNull();
  });

  it('accepts two different resources of the same type', () => {
    expect(
      errorFor({
        source: { type: 'TASK', id: A },
        target: { type: 'TASK', id: B },
      }),
    ).toBeNull();
  });

  it('rejects self-relationships (same type and id, any case)', () => {
    expect(
      errorFor({
        source: { type: 'TASK', id: A },
        target: { type: 'TASK', id: A.toUpperCase() },
      }),
    ).toBe('A resource cannot have a relationship with itself.');
  });

  it('allows the same id under different types', () => {
    expect(
      errorFor({
        source: { type: 'TASK', id: A },
        target: { type: 'GOAL', id: A },
      }),
    ).toBeNull();
  });

  it.each([
    [{ source: { type: 'USER', id: A } }, 'Unsupported source type.'],
    [{ target: { type: 'FILE', id: B } }, 'Unsupported target type.'],
    [{ source: { type: 'TASK', id: 'nope' } }, 'Invalid source id.'],
    [{ relationshipType: 'OWNS' }, 'Unsupported relationship type.'],
    [{ provenance: 'ROBOT' }, 'Unsupported relationship source.'],
  ] as [Partial<NewRelationship>, string][])('rejects %p', (patch, message) => {
    expect(errorFor(patch)).toBe(message);
  });

  it.each([-0.01, 1.01, Number.NaN, Number.POSITIVE_INFINITY])(
    'rejects confidence %p',
    (confidence) => {
      expect(
        errorFor({ provenance: 'AI', sourceDocumentId: DOC, confidence }),
      ).toBe('Confidence must be between 0 and 1.');
    },
  );

  it('USER relationships must have confidence 1', () => {
    expect(errorFor({ confidence: 0.9 })).toBe(
      'USER relationships always have confidence 1.',
    );
  });

  it('AI relationships require a source document (provenance)', () => {
    expect(errorFor({ provenance: 'AI', confidence: 0.7 })).toBe(
      'AI relationships require a source document.',
    );
    expect(
      errorFor({ provenance: 'AI', confidence: 0.7, sourceDocumentId: DOC }),
    ).toBeNull();
  });

  it('rejects a malformed source document id', () => {
    expect(errorFor({ sourceDocumentId: 'doc-1' })).toBe(
      'Invalid source document id.',
    );
  });

  it('enforces the endpoint rules', () => {
    expect(errorFor({ relationshipType: 'MENTIONS' })).toBe(
      'MENTIONS requires a source of type DOCUMENT.',
    );
    expect(
      errorFor({
        relationshipType: 'MENTIONS',
        source: { type: 'DOCUMENT', id: A },
        target: { type: 'ENTITY', id: B },
      }),
    ).toBeNull();
    expect(errorFor({ relationshipType: 'ASSIGNED_TO' })).toBe(
      'ASSIGNED_TO requires a target of type ENTITY.',
    );
    expect(
      errorFor({
        relationshipType: 'CREATED_BY',
        target: { type: 'ENTITY', id: B },
      }),
    ).toBeNull();
  });
});
