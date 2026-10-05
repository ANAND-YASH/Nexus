import { QueryFailedError } from 'typeorm';

const FOREIGN_KEY_VIOLATION = '23503';
/** e.g. a document whose text search vector would exceed 1 MB. */
export const PROGRAM_LIMIT_EXCEEDED = '54000';

export function hasErrorCode(error: unknown, code: string): boolean {
  return (
    error instanceof QueryFailedError &&
    (error.driverError as { code?: string }).code === code
  );
}

export function isForeignKeyViolation(
  error: unknown,
  constraint: string,
): boolean {
  if (!(error instanceof QueryFailedError)) return false;
  const driverError = error.driverError as {
    code?: string;
    constraint?: string;
  };
  return (
    driverError.code === FOREIGN_KEY_VIOLATION &&
    driverError.constraint === constraint
  );
}
