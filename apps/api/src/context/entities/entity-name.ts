/** Maximum entity name length (characters). */
export const ENTITY_NAME_MAX_LENGTH = 200;

/**
 * Canonical form used for lookup and de-duplication: Unicode NFKC (so
 * full-width or ligature variants match), trimmed, internal whitespace
 * collapsed, lowercased. "  ACME   Corp " and "acme corp" are the same name.
 */
export function normalizeEntityName(name: string): string {
  return name.normalize('NFKC').trim().replace(/\s+/g, ' ').toLowerCase();
}

/** Display form: trimmed with collapsed whitespace; case is preserved. */
export function cleanEntityName(name: string): string {
  return name.normalize('NFKC').trim().replace(/\s+/g, ' ');
}
