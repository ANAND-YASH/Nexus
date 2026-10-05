import { Transform } from 'class-transformer';
import { ValidateIf } from 'class-validator';

/**
 * Optional for PATCH, but not nullable: skips validation only when the field
 * is absent, so `null` still fails the field's other validators. (Use
 * `@IsOptional()` for fields where `null` legitimately clears the value.)
 */
export const IsOptionalNonNull = () =>
  ValidateIf((_object, value) => value !== undefined);

/** Trims string input; other types pass through to fail validation. */
export const Trim = () =>
  Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  );

/** Shared length limits for user-entered text. */
export const NAME_MAX_LENGTH = 200;
export const DESCRIPTION_MAX_LENGTH = 10_000;

/**
 * Copies only the keys the client actually sent. DTO class fields exist as
 * `undefined` (useDefineForClassFields), so a plain Object.assign would wipe
 * values the client didn't mention.
 */
export function definedOnly<T extends object>(dto: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(dto).filter(([, value]) => value !== undefined),
  ) as Partial<T>;
}
