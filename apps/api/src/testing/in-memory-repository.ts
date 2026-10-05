/**
 * Minimal in-memory stand-in for the TypeORM Repository methods the domain
 * services use, so unit tests exercise real ownership logic without a
 * database. `where` supports exact-match equality only — which is exactly how
 * the services scope by owner. Not imported by application code.
 */
import { randomUUID } from 'node:crypto';
import type { Repository } from 'typeorm';

interface Row {
  id: string;
  createdAt: Date;
  updatedAt: Date;
}

type Where<T> = Partial<Record<keyof T, unknown>>;

export class InMemoryRepository<T extends Row> {
  readonly rows: T[] = [];
  private clock = Date.now();

  /** Seeds a row directly, as if it had been inserted by another request. */
  seed(data: Partial<T>): T {
    const row = { ...data } as T;
    this.stamp(row);
    this.rows.push(row);
    return { ...row };
  }

  create(data: Partial<T>): T {
    return { ...data } as T;
  }

  save(entity: T): Promise<T> {
    this.stamp(entity);
    const index = this.rows.findIndex((row) => row.id === entity.id);
    if (index === -1) this.rows.push({ ...entity });
    else this.rows[index] = { ...entity };
    return Promise.resolve(entity);
  }

  find(options: {
    where: Where<T>;
    order?: Partial<Record<keyof T, 'ASC' | 'DESC'>>;
  }): Promise<T[]> {
    const rows = this.match(options.where);
    const order = Object.entries(options.order ?? {}) as [
      keyof T,
      'ASC' | 'DESC',
    ][];
    rows.sort((a, b) => {
      for (const [key, direction] of order) {
        const cmp = compare(a[key], b[key]);
        if (cmp !== 0) return direction === 'ASC' ? cmp : -cmp;
      }
      return 0;
    });
    return Promise.resolve(rows);
  }

  findOne(options: { where: Where<T> }): Promise<T | null> {
    return Promise.resolve(this.match(options.where)[0] ?? null);
  }

  exists(options: { where: Where<T> }): Promise<boolean> {
    return Promise.resolve(this.match(options.where).length > 0);
  }

  delete(where: Where<T>): Promise<{ affected: number }> {
    const doomed = new Set(this.match(where).map((row) => row.id));
    const before = this.rows.length;
    this.rows.splice(
      0,
      this.rows.length,
      ...this.rows.filter((row) => !doomed.has(row.id)),
    );
    return Promise.resolve({ affected: before - this.rows.length });
  }

  asRepository(): Repository<T> {
    return this as unknown as Repository<T>;
  }

  private match(where: Where<T>): T[] {
    return this.rows
      .filter((row) =>
        Object.entries(where).every(
          ([key, value]) => row[key as keyof T] === value,
        ),
      )
      .map((row) => ({ ...row }));
  }

  /** Mimics DB defaults: generated id, created/updated timestamps. */
  private stamp(row: T): void {
    // Strictly increasing so created-at ordering is deterministic.
    const now = new Date((this.clock += 1));
    row.id ??= randomUUID();
    row.createdAt ??= now;
    row.updatedAt = now;
  }
}

function compare(a: unknown, b: unknown): number {
  const left = a instanceof Date ? a.getTime() : (a as string | number);
  const right = b instanceof Date ? b.getTime() : (b as string | number);
  return left < right ? -1 : left > right ? 1 : 0;
}
