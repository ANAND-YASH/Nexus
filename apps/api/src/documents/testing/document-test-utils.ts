/**
 * Test doubles for document unit tests. Not imported by application code.
 */
import { DocumentSourceType } from '@nexus/types';
import type { Repository, SelectQueryBuilder } from 'typeorm';
import { InMemoryRepository } from '../../testing/in-memory-repository';
import type { Document } from '../document.entity';
import type {
  DocumentLinksStore,
  LinkKey,
  LinkKind,
} from '../links/document-links.store';

export const ALICE = '00000000-0000-4000-8000-00000000000a';
export const BOB = '00000000-0000-4000-8000-00000000000b';

export function documentFields(overrides: Partial<Document> = {}) {
  return {
    title: 'Notes',
    content: 'Some content',
    mimeType: 'text/plain',
    sourceType: DocumentSourceType.MANUAL,
    sourceUrl: null,
    fileName: null,
    fileSizeBytes: null,
    checksum: null,
    ...overrides,
  };
}

/** Same contract as DocumentLinksStore, backed by a Set. */
export class InMemoryLinksStore implements Pick<
  DocumentLinksStore,
  'link' | 'unlink' | 'relationships'
> {
  readonly links = new Set<string>();

  private key(kind: LinkKind, k: LinkKey) {
    return `${kind}|${k.ownerId}|${k.documentId}|${k.targetId}`;
  }

  link(kind: LinkKind, key: LinkKey): Promise<void> {
    this.links.add(this.key(kind, key));
    return Promise.resolve();
  }

  unlink(kind: LinkKind, key: LinkKey): Promise<boolean> {
    return Promise.resolve(this.links.delete(this.key(kind, key)));
  }

  relationships(ownerId: string, documentId: string) {
    const ids = (kind: LinkKind) =>
      [...this.links]
        .map((l) => l.split('|'))
        .filter(([k, o, d]) => k === kind && o === ownerId && d === documentId)
        .map(([, , , target]) => target!);
    return Promise.resolve({
      projectIds: ids('project'),
      taskIds: ids('task'),
      goalIds: ids('goal'),
    });
  }

  asStore(): DocumentLinksStore {
    return this as unknown as DocumentLinksStore;
  }
}

export interface RecordedQuery {
  select: string[];
  where: { sql: string; params: Record<string, unknown> }[];
  order: [string, string][];
}

/**
 * Repository whose createQueryBuilder records the query instead of running
 * it, so list() can be checked for owner scoping and parameter binding.
 */
export function recordingRepository(
  base: InMemoryRepository<Document>,
  rows: Document[] = [],
): { repository: Repository<Document>; recorded: RecordedQuery } {
  const recorded: RecordedQuery = { select: [], where: [], order: [] };
  const qb = {
    select(columns: string[]) {
      recorded.select = columns;
      return qb;
    },
    where(sql: string, params: Record<string, unknown> = {}) {
      recorded.where.push({ sql, params });
      return qb;
    },
    andWhere(sql: string, params: Record<string, unknown> = {}) {
      recorded.where.push({ sql, params });
      return qb;
    },
    orderBy(column: string, direction: string) {
      recorded.order.push([column, direction]);
      return qb;
    },
    addOrderBy(column: string, direction: string) {
      recorded.order.push([column, direction]);
      return qb;
    },
    getMany: () => Promise.resolve(rows),
  };
  const repository = Object.assign(Object.create(base) as object, {
    createQueryBuilder: () => qb as unknown as SelectQueryBuilder<Document>,
  }) as unknown as Repository<Document>;
  return { repository, recorded };
}
