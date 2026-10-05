/**
 * Documents and document relationships against a real PostgreSQL, focused on
 * ownership, relationship integrity and search. Requires `pnpm docker:up` and
 * `pnpm db:migration:run` beforehand.
 *
 * Users are `e2e-<run>-<uuid>@nexus.test` and are deleted in afterAll; documents,
 * links, projects, tasks and goals cascade with them.
 */
import { randomUUID } from 'node:crypto';
import { type INestApplication } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import type {
  AuthResponse,
  DocumentDetailResponse,
  DocumentResponse,
  DocumentSummaryResponse,
} from '@nexus/types';
import request from 'supertest';
import { type App } from 'supertest/types';
import { DataSource } from 'typeorm';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';
import { e2eUsers } from './e2e-users';

const users = e2eUsers();

interface Actor {
  id: string;
  token: string;
}

type Kind = 'projects' | 'tasks' | 'goals';

describe('Documents (e2e)', () => {
  let app: INestApplication<App>;
  let db: DataSource;
  let alice: Actor;
  let bob: Actor;

  const http = () => request(app.getHttpServer());
  const auth = (actor: Actor) => ({ Authorization: `Bearer ${actor.token}` });
  const as = (actor: Actor) => ({
    get: (url: string) => http().get(url).set(auth(actor)),
    post: (url: string, body?: object) =>
      http().post(url).set(auth(actor)).send(body),
    patch: (url: string, body: object) =>
      http().patch(url).set(auth(actor)).send(body),
    delete: (url: string) => http().delete(url).set(auth(actor)),
  });

  const signUp = async (): Promise<Actor> => {
    const res = await http()
      .post('/api/auth/register')
      .send({
        email: users.newEmail(),
        password: 'correct horse battery staple',
      })
      .expect(201);
    const body = res.body as AuthResponse;
    return { id: body.user.id, token: body.accessToken };
  };

  const createDocument = async (actor: Actor, body: object = {}) =>
    (
      await as(actor)
        .post('/api/documents', {
          title: 'Notes',
          content: 'Plain notes',
          mimeType: 'text/plain',
          sourceType: 'MANUAL',
          ...body,
        })
        .expect(201)
    ).body as DocumentResponse;

  const createTarget = async (actor: Actor, kind: Kind) => {
    const body = kind === 'projects' ? { name: 'P' } : { title: 'T' };
    return (
      (await as(actor).post(`/api/${kind}`, body).expect(201)).body as {
        id: string;
      }
    ).id;
  };

  const linkCount = async (
    table: string,
    where: string,
    params: unknown[],
  ): Promise<number> =>
    (
      (await db.query(
        `SELECT count(*)::int AS n FROM ${table} WHERE ${where}`,
        params,
      )) as { n: number }[]
    )[0]!.n;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication();
    configureApp(app);
    await app.init();
    db = app.get(DataSource);
    [alice, bob] = await Promise.all([signUp(), signUp()]);
  });

  afterAll(async () => {
    await users.cleanup(db);
    await app.close();
  });

  it('requires authentication on every documents route', async () => {
    const id = randomUUID();
    await http().get('/api/documents').expect(401);
    await http().post('/api/documents').send({}).expect(401);
    await http().get(`/api/documents/${id}`).expect(401);
    await http().post(`/api/documents/${id}/projects/${id}`).expect(401);
  });

  describe('CRUD', () => {
    it('creates, reads, patches and deletes an own document', async () => {
      const created = await createDocument(alice, {
        title: '  Auth design ',
        mimeType: 'Text/Markdown',
        sourceType: 'URL',
        sourceUrl: 'https://example.com/auth',
        fileSizeBytes: 4096,
        checksum: 'A'.repeat(64),
      });
      expect(created).toMatchObject({
        title: 'Auth design',
        mimeType: 'text/markdown',
        fileSizeBytes: 4096,
        checksum: 'a'.repeat(64),
      });
      expect(created).not.toHaveProperty('ownerId');

      const [stored] = (await db.query(
        'SELECT owner_id, file_size_bytes FROM documents WHERE id = $1',
        [created.id],
      )) as { owner_id: string; file_size_bytes: string }[];
      expect(stored).toEqual({ owner_id: alice.id, file_size_bytes: '4096' });

      const detail = (
        await as(alice).get(`/api/documents/${created.id}`).expect(200)
      ).body as DocumentDetailResponse;
      expect(detail).toMatchObject({
        content: 'Plain notes',
        projectIds: [],
        taskIds: [],
        goalIds: [],
      });

      const patched = (
        await as(alice)
          .patch(`/api/documents/${created.id}`, {
            content: 'Updated body',
            sourceUrl: null,
          })
          .expect(200)
      ).body as DocumentResponse;
      expect(patched).toMatchObject({
        title: 'Auth design',
        content: 'Updated body',
        sourceUrl: null,
        checksum: 'a'.repeat(64),
      });
      expect(Date.parse(patched.updatedAt)).toBeGreaterThan(
        Date.parse(created.updatedAt),
      );

      await as(alice).delete(`/api/documents/${created.id}`).expect(204);
      await as(alice).get(`/api/documents/${created.id}`).expect(404);
    });

    it('rejects invalid input, ownerId and null required fields', async () => {
      await as(alice)
        .post('/api/documents', {
          title: 'x',
          content: '   ',
          mimeType: 'text/plain',
          sourceType: 'MANUAL',
        })
        .expect(400);
      await as(alice)
        .post('/api/documents', {
          title: 'x',
          content: 'y',
          mimeType: 'text/plain',
          sourceType: 'MANUAL',
          ownerId: bob.id,
        })
        .expect(400);
      const { id } = await createDocument(alice);
      await as(alice)
        .patch(`/api/documents/${id}`, { title: null })
        .expect(400);
      await as(alice)
        .patch(`/api/documents/${id}`, { createdAt: '2020-01-01T00:00:00Z' })
        .expect(400);
      await as(alice).get('/api/documents/not-a-uuid').expect(400);
    });

    it('accepts content near the 200k-character limit (body limit raised)', async () => {
      const content = 'lorem ipsum dolor sit amet '.repeat(7_000); // ~189k chars
      const created = await createDocument(alice, { content });
      expect(created.content).toHaveLength(content.length);
    });
  });

  describe('owner isolation', () => {
    it("Alice cannot read, update or delete Bob's document", async () => {
      const bobs = await createDocument(bob, {
        title: 'Bob private',
        content: 'Bob secret plans',
      });

      const read = await as(alice).get(`/api/documents/${bobs.id}`).expect(404);
      const missing = await as(alice)
        .get(`/api/documents/${randomUUID()}`)
        .expect(404);
      expect(read.body).toEqual(missing.body);
      expect(JSON.stringify(read.body)).not.toContain('Bob');

      await as(alice)
        .patch(`/api/documents/${bobs.id}`, { title: 'Pwned' })
        .expect(404);
      await as(alice).delete(`/api/documents/${bobs.id}`).expect(404);

      const [stored] = (await db.query(
        'SELECT title FROM documents WHERE id = $1',
        [bobs.id],
      )) as { title: string }[];
      expect(stored?.title).toBe('Bob private');
    });

    it("lists never include another user's documents", async () => {
      await createDocument(bob, { title: 'Bob list item' });
      const list = (await as(alice).get('/api/documents').expect(200))
        .body as DocumentSummaryResponse[];
      expect(list.map((d) => d.title)).not.toContain('Bob list item');
      expect(list[0]).not.toHaveProperty('content');
    });
  });

  describe('filters and search', () => {
    let ids: Record<string, string>;

    beforeAll(async () => {
      const carol = await signUp();
      const make = async (body: object) =>
        (await createDocument(carol, body)).id;
      ids = {
        pdf: await make({
          title: 'Quarterly report',
          content: 'Revenue grew in every region',
          mimeType: 'application/pdf',
          sourceType: 'UPLOAD',
        }),
        auth: await make({
          title: 'Login flow',
          content: 'We use rotating refresh tokens for AUTHENTICATION.',
          mimeType: 'text/markdown',
        }),
        authTitle: await make({
          title: 'Authenticating webhooks',
          content: 'Verify signatures before trusting payloads.',
          mimeType: 'text/markdown',
          sourceType: 'IMPORT',
        }),
      };
      Object.assign(ids, { carolToken: carol.token });
      // Bob has a matching document that Carol must never see.
      await createDocument(bob, {
        title: 'Bob authentication notes',
        content: 'authentication authentication',
      });
    });

    const listAs = async (query: string) => {
      const res = await http()
        .get(`/api/documents${query}`)
        .set('Authorization', `Bearer ${ids.carolToken}`)
        .expect(200);
      return (res.body as DocumentSummaryResponse[]).map((d) => d.id);
    };

    it('filters by sourceType and mimeType (case-insensitive input)', async () => {
      expect(await listAs('?sourceType=UPLOAD')).toEqual([ids.pdf]);
      expect(await listAs('?mimeType=Application/PDF')).toEqual([ids.pdf]);
      expect(await listAs('?mimeType=text/markdown')).toEqual([
        ids.authTitle,
        ids.auth,
      ]);
    });

    it('searches title and content, case-insensitively, with stemming', async () => {
      // "authentication" (content, upper case) and "Authenticating" (title)
      // share the stem "authent".
      expect((await listAs('?search=authentication')).sort()).toEqual(
        [ids.auth, ids.authTitle].sort(),
      );
      expect(await listAs('?search=REVENUE')).toEqual([ids.pdf]);
      expect(await listAs('?search=quarterly%20report')).toEqual([ids.pdf]);
      expect(await listAs('?search=refresh%20-webhooks')).toEqual([ids.auth]);
    });

    it("search only returns the caller's documents", async () => {
      const results = await listAs('?search=authentication');
      const [bobsDoc] = (await db.query(
        `SELECT d.id FROM documents d WHERE d.title = 'Bob authentication notes'`,
      )) as { id: string }[];
      expect(results).not.toContain(bobsDoc!.id);
    });

    it('combines search with filters', async () => {
      expect(await listAs('?search=authentication&sourceType=IMPORT')).toEqual([
        ids.authTitle,
      ]);
    });

    it('treats hostile search input as plain text', async () => {
      const hostile = encodeURIComponent(`') OR 1=1; DROP TABLE documents; --`);
      expect(await listAs(`?search=${hostile}`)).toEqual([]);
      const [{ exists }] = (await db.query(
        `SELECT to_regclass('public.documents') IS NOT NULL AS exists`,
      )) as [{ exists: boolean }];
      expect(exists).toBe(true);
    });

    it('rejects unknown filters and invalid values', async () => {
      await as(alice).get('/api/documents?sourceType=EMAIL').expect(400);
      await as(alice).get('/api/documents?ownerId=x').expect(400);
      await as(alice).get('/api/documents?search=').expect(400);
    });
  });

  describe('relationships', () => {
    describe.each(['projects', 'tasks', 'goals'] as const)('%s', (kind) => {
      const table = `document_${kind}`;
      const column = `${kind.slice(0, -1)}_id`;

      it('links once (idempotent), shows in detail, and unlinks', async () => {
        const doc = await createDocument(alice);
        const target = await createTarget(alice, kind);
        const url = `/api/documents/${doc.id}/${kind}/${target}`;

        await as(alice).post(url).expect(204);
        await as(alice).post(url).expect(204);
        expect(
          await linkCount(table, `document_id = $1 AND ${column} = $2`, [
            doc.id,
            target,
          ]),
        ).toBe(1);

        const detail = (
          await as(alice).get(`/api/documents/${doc.id}`).expect(200)
        ).body as DocumentDetailResponse;
        expect(detail[`${kind.slice(0, -1)}Ids` as 'projectIds']).toEqual([
          target,
        ]);

        await as(alice).delete(url).expect(204);
        await as(alice).delete(url).expect(404);
        expect(await linkCount(table, 'document_id = $1', [doc.id])).toBe(0);
      });

      it(`Alice cannot link her document to Bob's ${kind.slice(0, -1)}`, async () => {
        const doc = await createDocument(alice);
        const bobsTarget = await createTarget(bob, kind);

        await as(alice)
          .post(`/api/documents/${doc.id}/${kind}/${bobsTarget}`)
          .expect(404);
        expect(await linkCount(table, 'document_id = $1', [doc.id])).toBe(0);
      });

      it(`Alice cannot link Bob's document to her ${kind.slice(0, -1)}`, async () => {
        const bobsDoc = await createDocument(bob);
        const target = await createTarget(alice, kind);

        await as(alice)
          .post(`/api/documents/${bobsDoc.id}/${kind}/${target}`)
          .expect(404);
        expect(await linkCount(table, 'document_id = $1', [bobsDoc.id])).toBe(
          0,
        );
      });

      it('the database rejects a cross-user link even via raw SQL', async () => {
        const doc = await createDocument(alice);
        const bobsTarget = await createTarget(bob, kind);

        await expect(
          db.query(
            `INSERT INTO ${table} (owner_id, document_id, ${column}) VALUES ($1, $2, $3)`,
            [alice.id, doc.id, bobsTarget],
          ),
        ).rejects.toMatchObject({
          driverError: { constraint: `FK_${table}_${kind.slice(0, -1)}` },
        });
      });

      it('the database rejects duplicate links', async () => {
        const doc = await createDocument(alice);
        const target = await createTarget(alice, kind);
        const insert = () =>
          db.query(
            `INSERT INTO ${table} (owner_id, document_id, ${column}) VALUES ($1, $2, $3)`,
            [alice.id, doc.id, target],
          );

        await insert();
        await expect(insert()).rejects.toMatchObject({
          driverError: { code: '23505' },
        });
      });

      it(`deleting the ${kind.slice(0, -1)} removes the link but keeps the document`, async () => {
        const doc = await createDocument(alice);
        const target = await createTarget(alice, kind);
        await as(alice)
          .post(`/api/documents/${doc.id}/${kind}/${target}`)
          .expect(204);

        await as(alice).delete(`/api/${kind}/${target}`).expect(204);

        expect(await linkCount(table, 'document_id = $1', [doc.id])).toBe(0);
        const detail = (
          await as(alice).get(`/api/documents/${doc.id}`).expect(200)
        ).body as DocumentDetailResponse;
        expect(detail.title).toBe('Notes');
      });
    });

    it('deleting a document removes all of its link rows only', async () => {
      const doc = await createDocument(alice);
      const project = await createTarget(alice, 'projects');
      const task = await createTarget(alice, 'tasks');
      const goal = await createTarget(alice, 'goals');
      for (const [kind, id] of [
        ['projects', project],
        ['tasks', task],
        ['goals', goal],
      ] as const) {
        await as(alice)
          .post(`/api/documents/${doc.id}/${kind}/${id}`)
          .expect(204);
      }

      await as(alice).delete(`/api/documents/${doc.id}`).expect(204);

      for (const table of [
        'document_projects',
        'document_tasks',
        'document_goals',
      ]) {
        expect(await linkCount(table, 'document_id = $1', [doc.id])).toBe(0);
      }
      // The linked records themselves survive.
      await as(alice).get(`/api/projects/${project}`).expect(200);
      await as(alice).get(`/api/tasks/${task}`).expect(200);
      await as(alice).get(`/api/goals/${goal}`).expect(200);
    });

    it('rejects malformed ids in relationship routes', async () => {
      const doc = await createDocument(alice);
      await as(alice)
        .post(`/api/documents/${doc.id}/projects/nope`)
        .expect(400);
    });
  });

  it('deleting a user deletes their documents and links', async () => {
    const dave = await signUp();
    const doc = await createDocument(dave);
    const project = await createTarget(dave, 'projects');
    await as(dave)
      .post(`/api/documents/${doc.id}/projects/${project}`)
      .expect(204);

    await db.query('DELETE FROM users WHERE id = $1', [dave.id]);

    expect(await linkCount('documents', 'owner_id = $1', [dave.id])).toBe(0);
    expect(
      await linkCount('document_projects', 'owner_id = $1', [dave.id]),
    ).toBe(0);
  });

  it('the database rejects a negative file size', async () => {
    await expect(
      db.query(
        `INSERT INTO documents (owner_id, title, content, mime_type, source_type, file_size_bytes)
         VALUES ($1, 't', 'c', 'text/plain', 'MANUAL', -1)`,
        [alice.id],
      ),
    ).rejects.toMatchObject({
      driverError: { constraint: 'CHK_documents_file_size_bytes' },
    });
  });
});
