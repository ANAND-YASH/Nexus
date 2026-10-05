import { randomUUID } from 'node:crypto';
import type { DataSource } from 'typeorm';

/**
 * Test-user emails scoped to one suite run: `e2e-<run>-<uuid>@nexus.test`.
 * Jest runs e2e suites in parallel against the same database, so each suite
 * must delete only its own users — a shared `e2e-%` pattern would delete
 * users that another, still-running suite depends on.
 */
export function e2eUsers() {
  const run = randomUUID().slice(0, 8);
  const pattern = `e2e-${run}-%@nexus.test`;
  return {
    newEmail: () => `e2e-${run}-${randomUUID()}@nexus.test`,
    /** Deletes this run's users; their data cascades with them. */
    cleanup: (db: DataSource) =>
      db
        .createQueryBuilder()
        .delete()
        .from('users')
        .where('email LIKE :pattern', { pattern })
        .execute(),
  };
}
