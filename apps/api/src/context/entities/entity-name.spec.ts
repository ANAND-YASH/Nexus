import { cleanEntityName, normalizeEntityName } from './entity-name';

describe('entity names', () => {
  it.each([
    ['  ACME   Corp ', 'acme corp'],
    ['acme corp', 'acme corp'],
    ['Ａｃｍｅ', 'acme'], // full-width → NFKC
    ['Ada\tLovelace\n', 'ada lovelace'],
    ['ﬁnance', 'finance'], // ligature → NFKC
  ])('normalizes %p → %p', (input, expected) => {
    expect(normalizeEntityName(input)).toBe(expected);
  });

  it('keeps case for display but cleans whitespace', () => {
    expect(cleanEntityName('  Ada   Lovelace ')).toBe('Ada Lovelace');
  });
});
