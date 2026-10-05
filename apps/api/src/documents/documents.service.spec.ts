import { NotFoundException, PayloadTooLargeException } from '@nestjs/common';
import { DocumentSourceType } from '@nexus/types';
import { QueryFailedError } from 'typeorm';
import { InMemoryRepository } from '../testing/in-memory-repository';
import type { Document } from './document.entity';
import { DocumentsService } from './documents.service';
import {
  ALICE,
  BOB,
  documentFields,
  InMemoryLinksStore,
  recordingRepository,
} from './testing/document-test-utils';

describe('DocumentsService', () => {
  let repo: InMemoryRepository<Document>;
  let links: InMemoryLinksStore;
  let service: DocumentsService;

  beforeEach(() => {
    repo = new InMemoryRepository<Document>();
    links = new InMemoryLinksStore();
    service = new DocumentsService(repo.asRepository(), links.asStore());
  });

  const bobsDocument = () =>
    repo.seed({ ownerId: BOB, ...documentFields({ title: "Bob's secret" }) });

  describe('create', () => {
    it('stores the document for the caller and returns a clean response', async () => {
      const document = await service.create(ALICE, {
        title: 'Auth design',
        content: 'Rotating refresh tokens…',
        mimeType: 'text/markdown',
        sourceType: DocumentSourceType.MANUAL,
        fileSizeBytes: 1234,
      });

      expect(document).toEqual({
        id: expect.any(String),
        title: 'Auth design',
        content: 'Rotating refresh tokens…',
        mimeType: 'text/markdown',
        sourceType: 'MANUAL',
        sourceUrl: null,
        fileName: null,
        fileSizeBytes: 1234,
        checksum: null,
        createdAt: expect.any(String),
        updatedAt: expect.any(String),
      });
      expect(repo.rows[0]!.ownerId).toBe(ALICE);
    });

    it('maps the search-index size limit (54000) to 413 without echoing content', async () => {
      jest.spyOn(repo, 'save').mockRejectedValueOnce(
        new QueryFailedError('INSERT', [], {
          code: '54000',
          message: 'string is too long for tsvector',
        } as unknown as Error),
      );

      const error = await service
        .create(ALICE, {
          ...documentFields({ content: 'SECRET-CONTENT' }),
          sourceType: DocumentSourceType.UPLOAD,
        })
        .catch((e: unknown) => e);

      expect(error).toBeInstanceOf(PayloadTooLargeException);
      expect(
        JSON.stringify((error as PayloadTooLargeException).getResponse()),
      ).not.toContain('SECRET-CONTENT');
    });
  });

  describe('get', () => {
    it('returns the document with its relationship ids', async () => {
      const { id } = await service.create(ALICE, {
        ...documentFields(),
        sourceType: DocumentSourceType.MANUAL,
      });
      await links.link('project', {
        ownerId: ALICE,
        documentId: id,
        targetId: 'p1',
      });
      await links.link('goal', {
        ownerId: ALICE,
        documentId: id,
        targetId: 'g1',
      });

      await expect(service.get(ALICE, id)).resolves.toMatchObject({
        id,
        content: 'Some content',
        projectIds: ['p1'],
        taskIds: [],
        goalIds: ['g1'],
      });
    });

    it("hides another user's document behind the same 404 as a missing one", async () => {
      const { id } = bobsDocument();

      const foreign = await service.get(ALICE, id).catch((e: unknown) => e);
      const missing = await service
        .get(ALICE, crypto.randomUUID())
        .catch((e: unknown) => e);

      expect(foreign).toBeInstanceOf(NotFoundException);
      expect(foreign).toEqual(missing);
      expect(JSON.stringify(foreign)).not.toContain("Bob's secret");
    });
  });

  describe('update (PATCH semantics)', () => {
    it('leaves omitted fields unchanged', async () => {
      const { id } = await service.create(ALICE, {
        ...documentFields({ fileName: 'notes.txt', checksum: 'a'.repeat(64) }),
        sourceType: DocumentSourceType.UPLOAD,
      });

      const updated = await service.update(ALICE, id, { title: 'Renamed' });

      expect(updated).toMatchObject({
        title: 'Renamed',
        content: 'Some content',
        fileName: 'notes.txt',
        checksum: 'a'.repeat(64),
        sourceType: 'UPLOAD',
      });
    });

    it('clears nullable fields set to null', async () => {
      const { id } = await service.create(ALICE, {
        ...documentFields({
          sourceUrl: 'https://example.com/a',
          fileName: 'a.md',
          fileSizeBytes: 10,
          checksum: 'b'.repeat(32),
        }),
        sourceType: DocumentSourceType.URL,
      });

      const updated = await service.update(ALICE, id, {
        sourceUrl: null,
        fileName: null,
        fileSizeBytes: null,
        checksum: null,
      });

      expect(updated).toMatchObject({
        sourceUrl: null,
        fileName: null,
        fileSizeBytes: null,
        checksum: null,
      });
    });

    it('updates content and bumps updatedAt', async () => {
      const created = await service.create(ALICE, {
        ...documentFields(),
        sourceType: DocumentSourceType.MANUAL,
      });

      const updated = await service.update(ALICE, created.id, {
        content: 'New body',
      });

      expect(updated.content).toBe('New body');
      expect(Date.parse(updated.updatedAt)).toBeGreaterThan(
        Date.parse(created.updatedAt),
      );
      expect(updated.createdAt).toBe(created.createdAt);
    });

    it("cannot update another user's document", async () => {
      const { id } = bobsDocument();

      await expect(
        service.update(ALICE, id, { title: 'Hijacked' }),
      ).rejects.toThrow(NotFoundException);
      expect(repo.rows[0]!.title).toBe("Bob's secret");
    });
  });

  describe('remove', () => {
    it('deletes an own document', async () => {
      const { id } = await service.create(ALICE, {
        ...documentFields(),
        sourceType: DocumentSourceType.MANUAL,
      });
      await service.remove(ALICE, id);
      expect(repo.rows).toHaveLength(0);
    });

    it("cannot delete another user's document", async () => {
      const { id } = bobsDocument();
      await expect(service.remove(ALICE, id)).rejects.toThrow(
        NotFoundException,
      );
      expect(repo.rows).toHaveLength(1);
    });
  });

  describe('assertOwned', () => {
    it('passes for own and 404s for foreign or missing documents', async () => {
      const { id } = await service.create(ALICE, {
        ...documentFields(),
        sourceType: DocumentSourceType.MANUAL,
      });

      await expect(service.assertOwned(ALICE, id)).resolves.toBeUndefined();
      await expect(service.assertOwned(BOB, id)).rejects.toThrow(
        'Document not found.',
      );
    });
  });

  describe('list (query construction)', () => {
    const listWith = async (query: Parameters<DocumentsService['list']>[1]) => {
      const { repository, recorded } = recordingRepository(repo);
      await new DocumentsService(repository, links.asStore()).list(
        ALICE,
        query,
      );
      return recorded;
    };

    it('always scopes by owner first and orders newest first', async () => {
      const recorded = await listWith({});

      expect(recorded.where).toEqual([
        { sql: 'document.ownerId = :ownerId', params: { ownerId: ALICE } },
      ]);
      expect(recorded.order).toEqual([
        ['document.createdAt', 'DESC'],
        ['document.id', 'ASC'],
      ]);
    });

    it('never selects content for lists', async () => {
      const recorded = await listWith({});

      expect(recorded.select).not.toContain('document.content');
      expect(recorded.select).toContain('document.title');
    });

    it('adds sourceType and mimeType filters as bound parameters', async () => {
      const recorded = await listWith({
        sourceType: DocumentSourceType.URL,
        mimeType: 'application/pdf',
      });

      expect(recorded.where.slice(1)).toEqual([
        {
          sql: 'document.sourceType = :sourceType',
          params: { sourceType: 'URL' },
        },
        {
          sql: 'document.mimeType = :mimeType',
          params: { mimeType: 'application/pdf' },
        },
      ]);
    });

    it('searches title + content with full-text search, never interpolating input', async () => {
      const hostile = `x'); DROP TABLE documents; --`;
      const recorded = await listWith({ search: hostile });
      const clause = recorded.where[1]!;

      expect(clause.sql).toBe(
        `to_tsvector('english', "document"."title" || ' ' || "document"."content") @@ websearch_to_tsquery('english', :search)`,
      );
      expect(clause.params).toEqual({ search: hostile });
      expect(recorded.where.map((w) => w.sql).join(' ')).not.toContain(
        'DROP TABLE',
      );
    });

    it('maps rows to summaries without content', async () => {
      const row = repo.seed({ ownerId: ALICE, ...documentFields() });
      const { repository } = recordingRepository(repo, [row]);

      const [summary] = await new DocumentsService(
        repository,
        links.asStore(),
      ).list(ALICE, {});

      expect(summary).not.toHaveProperty('content');
      expect(summary).toMatchObject({ id: row.id, title: 'Notes' });
    });
  });
});
