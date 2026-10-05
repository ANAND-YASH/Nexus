import { Transform } from 'class-transformer';
import {
  ValidateIf,
  ValidateBy,
  type ValidationOptions,
} from 'class-validator';

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

/** Upper bound for free-form JSON metadata stored with a record. */
export const METADATA_MAX_BYTES = 4_096;

/**
 * A plain JSON object (not an array or primitive) whose serialized size is at
 * most `maxBytes`. Used for free-form `metadata` fields.
 */
export const IsBoundedJsonObject = (
  maxBytes = METADATA_MAX_BYTES,
  options?: ValidationOptions,
) =>
  ValidateBy(
    {
      name: 'isBoundedJsonObject',
      validator: {
        validate: (value: unknown) =>
          typeof value === 'object' &&
          value !== null &&
          !Array.isArray(value) &&
          Buffer.byteLength(JSON.stringify(value), 'utf8') <= maxBytes,
        defaultMessage: (args) =>
          `${args?.property ?? 'value'} must be a JSON object of at most ${maxBytes} bytes`,
      },
    },
    options,
  );
