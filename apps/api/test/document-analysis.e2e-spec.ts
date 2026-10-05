/**
 * AI document analysis against real PostgreSQL and Redis (BullMQ), with the
 * AI provider replaced by a fake — no OpenAI calls, no API key needed.
 * Requires `pnpm docker:up` and `pnpm db:migration:run`.
 *
 * AI analysis is enabled only for this suite (env set before AppModule is
 * loaded, restored afterwards). Jobs use an isolated BullMQ key prefix that
 * is removed in afterAll; users (and their documents/analyses) are deleted.
 */
import { randomUUID } from 'node:crypto';
import { type INestApplication } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import type {
  AuthResponse,
  DocumentAnalysisResponse,
  DocumentAnalysisResult,
  DocumentResponse,
} from '@nexus/types';
import { Queue } from 'bullmq';
import request from 'supertest';
import { type App } from 'supertest/types';
import { DataSource } from 'typeorm';
import {
  DOCUMENT_ANALYSIS_QUEUE,
  DOCUMENT_ANALYSIS_QUEUE_OPTIONS,
  redisConnection,
} from '../src/ai/document-analysis/document-analysis.queue';
import {
  AnalysisError,
  DOCUMENT_ANALYZER,
  type DocumentAnalysisInput,
  type DocumentAnalyzer,
} from '../src/ai/document-analyzer';
import { configureApp } from '../src/app.setup';
import { e2eUsers } from './e2e-users';

const users = e2eUsers();
const PREFIX = `nexus-e2e-${randomUUID().slice(0, 8)}`;
const AI_ENV = {
  AI_DOCUMENT_ANALYSIS_ENABLED: 'true',
  OPENAI_API_KEY: 'sk-test-not-a-real-key',
  AI_DOCUMENT_ANALYSIS_MODEL: 'test-model',
};

const RESULT: DocumentAnalysisResult = {
  summary: 'Launch plan for v1.',
  keyPoints: ['Launch is in March.'],
  topics: ['launch'],
  entities: [{ name: 'Acme', type: 'organization' }],
  actionItems: [{ title: 'Book venue', priority: 'HIGH' }],
  importantDates: [{ date: '2027-03-01', description: 'Launch day' }],
};

/** Controllable stand-in for the OpenAI analyzer. */
class FakeAnalyzer implements DocumentAnalyzer {
  readonly model = 'test-model';
  readonly calls: DocumentAnalysisInput[] = [];
  behavior: () => Promise<DocumentAnalysisResult> = () =>
    Promise.resolve(RESULT);

  analyze(input: DocumentAnalysisInput) {
    this.calls.push(input);
    return this.behavior();
  }
}

interface Actor {
  id: string;
  token: string;
}

describe('Document analysis (e2e)', () => {
  let app: INestApplication<App>;
  let db: DataSource;
  let alice: Actor;
  let bob: Actor;
  const analyzer = new FakeAnalyzer();
  const savedEnv: Record<string, string | undefined> = {};

  const http = () => request(app.getHttpServer());
  const as = (actor: Actor) => ({
    get: (url: string) =>
      http().get(url).set('Authorization', `Bearer ${actor.token}`),
    post: (url: string, body?: object) =>
      http().post(url).set('Authorization', `Bearer ${actor.token}`).send(body),
    delete: (url: string) =>
      http().delete(url).set('Authorization', `Bearer ${actor.token}`),
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

  const createDocument = async (actor: Actor, content = 'Launch in March.') =>
    (
      (
        await as(actor)
          .post('/api/documents', {
            title: 'Launch plan',
            content,
            mimeType: 'text/plain',
            sourceType: 'MANUAL',
          })
          .expect(201)
      ).body as DocumentResponse
    ).id;

  /** Polls until the analysis leaves PENDING/PROCESSING. */
  const settled = async (actor: Actor, documentId: string) => {
    for (let i = 0; i < 100; i++) {
      const res = await as(actor).get(`/api/documents/${documentId}/analysis`);
      const body = res.body as DocumentAnalysisResponse;
      if (res.status === 200 && ['COMPLETED', 'FAILED'].includes(body.status)) {
        return body;
      }
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    throw new Error('Analysis did not settle in time');
  };

  const analysisRows = async (documentId: string) =>
    (await db.query(
      'SELECT id, owner_id, status FROM document_ai_analysis WHERE document_id = $1',
      [documentId],
    )) as { id: string; owner_id: string; status: string }[];

  beforeAll(async () => {
    for (const [key, value] of Object.entries(AI_ENV)) {
      savedEnv[key] = process.env[key];
      process.env[key] = value;
    }
    // Loaded only now so ConfigModule validates the env set above.
    const { AppModule } =
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      require('../src/app.module') as typeof import('../src/app.module');

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(DOCUMENT_ANALYZER)
      .useValue(analyzer)
      .overrideProvider(DOCUMENT_ANALYSIS_QUEUE_OPTIONS)
      .useValue({ prefix: PREFIX, concurrency: 2 })
      .compile();
    app = moduleFixture.createNestApplication();
    configureApp(app);
    await app.init();
    db = app.get(DataSource);
    [alice, bob] = await Promise.all([signUp(), signUp()]);
  });

  afterEach(() => {
    analyzer.behavior = () => Promise.resolve(RESULT);
  });

  afterAll(async () => {
    await users.cleanup(db);
    await app.close();
    // Remove this suite's BullMQ keys from Redis.
    const queue = new Queue(DOCUMENT_ANALYSIS_QUEUE, {
      connection: redisConnection(process.env.REDIS_URL!),
      prefix: PREFIX,
    });
    await queue.obliterate({ force: true });
    await queue.close();
    for (const [key, value] of Object.entries(savedEnv)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });

  it('requires authentication', async () => {
    const id = randomUUID();
    await http().post(`/api/documents/${id}/analyze`).expect(401);
    await http().get(`/api/documents/${id}/analysis`).expect(401);
  });

  it('queues analysis (202), processes it in the background and stores the result', async () => {
    const documentId = await createDocument(
      alice,
      'Launch in March. SECRET-BODY',
    );

    const accepted = await as(alice)
      .post(`/api/documents/${documentId}/analyze`)
      .expect(202);
    const queued = accepted.body as DocumentAnalysisResponse;
    expect(queued).toMatchObject({
      documentId,
      status: 'PENDING',
      model: 'test-model',
      summary: null,
    });
    expect(Object.keys(queued).sort()).toEqual(
      [
        'actionItems',
        'createdAt',
        'documentId',
        'entities',
        'error',
        'id',
        'importantDates',
        'keyPoints',
        'model',
        'status',
        'summary',
        'topics',
        'updatedAt',
      ].sort(),
    );

    const done = await settled(alice, documentId);
    expect(done).toMatchObject({
      id: queued.id,
      status: 'COMPLETED',
      ...RESULT,
      error: null,
    });

    // The provider saw title + content only.
    expect(analyzer.calls).toContainEqual({
      title: 'Launch plan',
      content: 'Launch in March. SECRET-BODY',
    });

    const rows = (await db.query(
      `SELECT owner_id, status, key_points, action_items FROM document_ai_analysis WHERE document_id = $1`,
      [documentId],
    )) as Record<string, unknown>[];
    expect(rows).toEqual([
      {
        owner_id: alice.id,
        status: 'COMPLETED',
        key_points: RESULT.keyPoints,
        action_items: RESULT.actionItems,
      },
    ]);
  });

  it('returns 404 before a document is analyzed', async () => {
    const documentId = await createDocument(alice);
    const res = await as(alice)
      .get(`/api/documents/${documentId}/analysis`)
      .expect(404);
    expect(res.body).toMatchObject({
      message: 'Document has not been analyzed.',
    });
  });

  it("a user cannot analyze another user's document", async () => {
    const bobsDoc = await createDocument(bob);

    const res = await as(alice)
      .post(`/api/documents/${bobsDoc}/analyze`)
      .expect(404);
    const missing = await as(alice)
      .post(`/api/documents/${randomUUID()}/analyze`)
      .expect(404);

    expect(res.body).toEqual(missing.body);
    expect(await analysisRows(bobsDoc)).toEqual([]);
  });

  it("a user cannot read another user's analysis", async () => {
    const bobsDoc = await createDocument(bob);
    await as(bob).post(`/api/documents/${bobsDoc}/analyze`).expect(202);
    await settled(bob, bobsDoc);

    const res = await as(alice)
      .get(`/api/documents/${bobsDoc}/analysis`)
      .expect(404);
    expect(res.body).toMatchObject({ message: 'Document not found.' });
    expect(JSON.stringify(res.body)).not.toContain('Launch plan for v1');
  });

  it('re-analysis reuses the single analysis record', async () => {
    const documentId = await createDocument(alice);
    await as(alice).post(`/api/documents/${documentId}/analyze`).expect(202);
    const first = await settled(alice, documentId);

    analyzer.behavior = () =>
      Promise.resolve({ ...RESULT, summary: 'Updated summary.' });
    const again = (
      await as(alice).post(`/api/documents/${documentId}/analyze`).expect(202)
    ).body as DocumentAnalysisResponse;
    expect(again).toMatchObject({
      id: first.id,
      status: 'PENDING',
      summary: null,
    });

    const second = await settled(alice, documentId);
    expect(second).toMatchObject({ id: first.id, summary: 'Updated summary.' });
    expect(await analysisRows(documentId)).toHaveLength(1);
  });

  it('concurrent analyze requests never create duplicate records', async () => {
    const documentId = await createDocument(alice);

    const responses = await Promise.all(
      Array.from({ length: 5 }, () =>
        as(alice).post(`/api/documents/${documentId}/analyze`),
      ),
    );

    expect(responses.map((r) => r.status)).toEqual([202, 202, 202, 202, 202]);
    const ids = new Set(
      responses.map((r) => (r.body as DocumentAnalysisResponse).id),
    );
    expect(ids.size).toBe(1);
    expect(await analysisRows(documentId)).toHaveLength(1);
    expect((await settled(alice, documentId)).status).toBe('COMPLETED');
  });

  it('a provider failure is stored as FAILED with a safe message only', async () => {
    const documentId = await createDocument(alice);
    analyzer.behavior = () =>
      Promise.reject(
        new AnalysisError(
          'PROVIDER_REJECTED',
          false,
          'OpenAI 401 invalid_api_key sk-SECRET',
        ),
      );

    await as(alice).post(`/api/documents/${documentId}/analyze`).expect(202);
    const failed = await settled(alice, documentId);

    expect(failed).toMatchObject({
      status: 'FAILED',
      error: 'The AI service could not process this document.',
      summary: null,
    });
    expect(JSON.stringify(failed)).not.toMatch(/SECRET|401|OpenAI/);

    // A failed analysis can be retried.
    analyzer.behavior = () => Promise.resolve(RESULT);
    await as(alice).post(`/api/documents/${documentId}/analyze`).expect(202);
    expect((await settled(alice, documentId)).status).toBe('COMPLETED');
  });

  it('deleting a document deletes its analysis', async () => {
    const documentId = await createDocument(alice);
    await as(alice).post(`/api/documents/${documentId}/analyze`).expect(202);
    await settled(alice, documentId);

    await as(alice).delete(`/api/documents/${documentId}`).expect(204);

    expect(await analysisRows(documentId)).toEqual([]);
  });

  describe('database constraints', () => {
    const insert = (documentId: string, ownerId: string) =>
      db.query(
        `INSERT INTO document_ai_analysis (document_id, owner_id, run_id, model)
         VALUES ($1, $2, gen_random_uuid(), 'm')`,
        [documentId, ownerId],
      );

    it('allows only one analysis per document', async () => {
      const documentId = await createDocument(alice);
      await insert(documentId, alice.id);

      await expect(insert(documentId, alice.id)).rejects.toMatchObject({
        driverError: {
          constraint: 'UQ_document_ai_analysis_document_id_owner_id',
        },
      });
    });

    it("rejects an analysis owned by someone other than the document's owner", async () => {
      const documentId = await createDocument(alice);

      await expect(insert(documentId, bob.id)).rejects.toMatchObject({
        driverError: { constraint: 'FK_document_ai_analysis_document' },
      });
    });
  });
});
