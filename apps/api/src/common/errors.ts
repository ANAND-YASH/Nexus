import { QueryFailedError } from 'typeorm';

const FOREIGN_KEY_VIOLATION = '23503';

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
