/**
 * Projects / tasks / goals against a real PostgreSQL, focused on ownership
 * and relationship behavior. Requires `pnpm docker:up` and
 * `pnpm db:migration:run` beforehand.
 *
 * Users are `e2e-<uuid>@nexus.test` and are deleted in afterAll; projects,
 * tasks, goals and sessions cascade with them.
 */
import { randomUUID } from 'node:crypto';
import { type INestApplication } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import type {
  AuthResponse,
  GoalResponse,
  ProjectResponse,
  TaskResponse,
} from '@nexus/types';
import request from 'supertest';
import { type App } from 'supertest/types';
import { DataSource, QueryFailedError } from 'typeorm';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';

const E2E_EMAIL_PATTERN = 'e2e-%@nexus.test';

interface Actor {
  id: string;
  token: string;
}

describe('Projects, tasks & goals (e2e)', () => {
  let app: INestApplication<App>;
  let db: DataSource;
  let alice: Actor;
  let bob: Actor;

  const http = () => request(app.getHttpServer());
  const as = (actor: Actor) => ({
    get: (url: string) =>
      http().get(url).set('Authorization', `Bearer ${actor.token}`),
    post: (url: string, body: object) =>
      http().post(url).set('Authorization', `Bearer ${actor.token}`).send(body),
    patch: (url: string, body: object) =>
      http()
        .patch(url)
        .set('Authorization', `Bearer ${actor.token}`)
        .send(body),
    delete: (url: string) =>
      http().delete(url).set('Authorization', `Bearer ${actor.token}`),
  });

  const signUp = async (): Promise<Actor> => {
    const res = await http()
      .post('/api/auth/register')
      .send({
        email: `e2e-${randomUUID()}@nexus.test`,
        password: 'correct horse battery staple',
      })
      .expect(201);
    const body = res.body as AuthResponse;
    return { id: body.user.id, token: body.accessToken };
  };

  const createProject = async (actor: Actor, name = 'Project') =>
    (await as(actor).post('/api/projects', { name }).expect(201))
      .body as ProjectResponse;

  const createTask = async (actor: Actor, body: object = {}) =>
    (
      await as(actor)
        .post('/api/tasks', { title: 'Task', ...body })
        .expect(201)
    ).body as TaskResponse;

  const row = async <T>(
    sql: string,
    params: unknown[],
  ): Promise<T | undefined> => ((await db.query(sql, params)) as T[])[0];

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
    await db
      .createQueryBuilder()
      .delete()
      .from('users')
      .where('email LIKE :pattern', { pattern: E2E_EMAIL_PATTERN })
      .execute();
    await app.close();
  });

  describe('authentication', () => {
    it.each(['/api/projects', '/api/tasks', '/api/goals'])(
      '%s requires an access token',
      async (url) => {
        await http().get(url).expect(401);
        await http().post(url).send({ name: 'x', title: 'x' }).expect(401);
      },
    );
  });

  describe('projects', () => {
    it('CRUD for the owner, with a clean response shape', async () => {
      const created = await createProject(alice, 'Launch');
      expect(Object.keys(created).sort()).toEqual([
        'createdAt',
        'description',
        'id',
        'name',
        'status',
        'updatedAt',
      ]);
      const stored = await row<{ owner_id: string }>(
        'SELECT owner_id FROM projects WHERE id = $1',
        [created.id],
      );
      expect(stored?.owner_id).toBe(alice.id);

      await as(alice).get(`/api/projects/${created.id}`).expect(200);
      const updated = await as(alice)
        .patch(`/api/projects/${created.id}`, { status: 'COMPLETED' })
        .expect(200);
      expect((updated.body as ProjectResponse).status).toBe('COMPLETED');

      await as(alice).delete(`/api/projects/${created.id}`).expect(204);
      await as(alice).get(`/api/projects/${created.id}`).expect(404);
    });

    it("another user's project is indistinguishable from a missing one", async () => {
      const { id } = await createProject(alice, 'Private');

      const foreign = await as(bob).get(`/api/projects/${id}`).expect(404);
      const missing = await as(bob)
        .get(`/api/projects/${randomUUID()}`)
        .expect(404);
      expect(foreign.body).toEqual(missing.body);

      await as(bob).patch(`/api/projects/${id}`, { name: 'Owned' }).expect(404);
      await as(bob).delete(`/api/projects/${id}`).expect(404);

      const stored = await row<{ name: string }>(
        'SELECT name FROM projects WHERE id = $1',
        [id],
      );
      expect(stored?.name).toBe('Private');
    });

    it('lists only own projects and filters by status', async () => {
      const mine = await createProject(alice, 'Mine');
      await createProject(bob, 'Not mine');
      await as(alice)
        .patch(`/api/projects/${mine.id}`, { status: 'ARCHIVED' })
        .expect(200);

      const all = (await as(alice).get('/api/projects').expect(200))
        .body as ProjectResponse[];
      const archived = (
        await as(alice).get('/api/projects?status=ARCHIVED').expect(200)
      ).body as ProjectResponse[];

      expect(all.map((p) => p.name)).not.toContain('Not mine');
      expect(archived.map((p) => p.id)).toEqual([mine.id]);
    });

    it('validates input, ids and query parameters', async () => {
      await as(alice).post('/api/projects', { name: '' }).expect(400);
      await as(alice)
        .post('/api/projects', { name: 'x', ownerId: bob.id })
        .expect(400);
      await as(alice).get('/api/projects/not-a-uuid').expect(400);
      await as(alice).get('/api/projects?status=DONE').expect(400);
    });
  });

  describe('tasks', () => {
    it('creates a task in an own project', async () => {
      const project = await createProject(alice);
      const task = await createTask(alice, {
        projectId: project.id,
        priority: 'HIGH',
        dueAt: '2026-12-01T09:00:00+01:00',
      });

      expect(task).toMatchObject({
        projectId: project.id,
        priority: 'HIGH',
        dueAt: '2026-12-01T08:00:00.000Z',
      });
      expect(task).not.toHaveProperty('ownerId');
    });

    it("rejects attaching a task to another user's project (create and update)", async () => {
      const alicesProject = await createProject(alice, 'Alice only');
      const res = await as(bob)
        .post('/api/tasks', { title: 'Sneaky', projectId: alicesProject.id })
        .expect(404);
      expect(res.body).toMatchObject({ message: 'Project not found.' });

      const bobsTask = await createTask(bob);
      await as(bob)
        .patch(`/api/tasks/${bobsTask.id}`, { projectId: alicesProject.id })
        .expect(404);

      const after = await row<{ n: number }>(
        'SELECT count(*)::int AS n FROM tasks WHERE owner_id = $1 AND project_id IS NOT NULL',
        [bob.id],
      );
      expect(after?.n).toBe(0);
    });

    it('the database itself rejects a cross-user task → project link', async () => {
      const alicesProject = await createProject(alice);

      await expect(
        db.query(
          'INSERT INTO tasks (owner_id, project_id, title) VALUES ($1, $2, $3)',
          [bob.id, alicesProject.id, 'Direct SQL'],
        ),
      ).rejects.toMatchObject({
        driverError: { constraint: 'FK_tasks_project_id_owner_id' },
      });
    });

    it("another user's task is a 404 for read, update and delete", async () => {
      const { id } = await createTask(alice, { title: 'Private' });

      await as(bob).get(`/api/tasks/${id}`).expect(404);
      await as(bob)
        .patch(`/api/tasks/${id}`, { title: 'Mine now' })
        .expect(404);
      await as(bob).delete(`/api/tasks/${id}`).expect(404);

      const stored = await row<{ title: string }>(
        'SELECT title FROM tasks WHERE id = $1',
        [id],
      );
      expect(stored?.title).toBe('Private');
    });

    it('lists only own tasks and supports filters', async () => {
      const project = await createProject(alice);
      const inProject = await createTask(alice, {
        projectId: project.id,
        priority: 'URGENT',
        status: 'IN_PROGRESS',
      });
      await createTask(alice, { priority: 'LOW' });
      await createTask(bob, { title: 'Bob task' });

      const list = async (query: string) =>
        (
          (await as(alice).get(`/api/tasks${query}`).expect(200))
            .body as TaskResponse[]
        ).map((t) => t.id);

      expect(await list('')).not.toHaveLength(0);
      const all = (await as(alice).get('/api/tasks').expect(200))
        .body as TaskResponse[];
      expect(all.map((t) => t.title)).not.toContain('Bob task');
      expect(await list(`?projectId=${project.id}`)).toEqual([inProject.id]);
      expect(
        await list(
          `?projectId=${project.id}&status=IN_PROGRESS&priority=URGENT`,
        ),
      ).toEqual([inProject.id]);
      expect(await list(`?projectId=${project.id}&priority=LOW`)).toEqual([]);
      await as(alice).get('/api/tasks?priority=CRITICAL').expect(400);
      await as(alice).get('/api/tasks?projectId=123').expect(400);
    });

    it('manages completedAt on the server and persists it', async () => {
      const { id } = await createTask(alice);

      const done = (
        await as(alice)
          .patch(`/api/tasks/${id}`, { status: 'COMPLETED' })
          .expect(200)
      ).body as TaskResponse;
      expect(done.completedAt).not.toBeNull();
      const stored = await row<{ completed_at: Date }>(
        'SELECT completed_at FROM tasks WHERE id = $1',
        [id],
      );
      expect(stored?.completed_at.toISOString()).toBe(done.completedAt);

      // Clients cannot set it directly.
      await as(alice)
        .patch(`/api/tasks/${id}`, { completedAt: '2020-01-01T00:00:00Z' })
        .expect(400);

      const reopened = (
        await as(alice)
          .patch(`/api/tasks/${id}`, { status: 'TODO' })
          .expect(200)
      ).body as TaskResponse;
      expect(reopened.completedAt).toBeNull();
      const cleared = await row<{ completed_at: Date | null }>(
        'SELECT completed_at FROM tasks WHERE id = $1',
        [id],
      );
      expect(cleared?.completed_at).toBeNull();
    });

    it('the database rejects inconsistent status/completed_at rows', async () => {
      const { id } = await createTask(alice);

      await expect(
        db.query(`UPDATE tasks SET status = 'COMPLETED' WHERE id = $1`, [id]),
      ).rejects.toBeInstanceOf(QueryFailedError);
    });

    it('deleting a project keeps its tasks and nulls their projectId', async () => {
      const project = await createProject(alice);
      const task = await createTask(alice, { projectId: project.id });

      await as(alice).delete(`/api/projects/${project.id}`).expect(204);

      const stored = await row<{ project_id: string | null; owner_id: string }>(
        'SELECT project_id, owner_id FROM tasks WHERE id = $1',
        [task.id],
      );
      expect(stored).toEqual({ project_id: null, owner_id: alice.id });
      const res = await as(alice).get(`/api/tasks/${task.id}`).expect(200);
      expect((res.body as TaskResponse).projectId).toBeNull();
    });

    it('deletes an own task', async () => {
      const { id } = await createTask(alice);
      await as(alice).delete(`/api/tasks/${id}`).expect(204);
      expect(
        await row('SELECT 1 FROM tasks WHERE id = $1', [id]),
      ).toBeUndefined();
    });
  });

  describe('goals', () => {
    it('CRUD for the owner with date-only targetDate', async () => {
      const created = (
        await as(alice)
          .post('/api/goals', { title: 'Ship v1', targetDate: '2027-03-31' })
          .expect(201)
      ).body as GoalResponse;
      expect(created).toMatchObject({
        title: 'Ship v1',
        status: 'ACTIVE',
        targetDate: '2027-03-31',
      });
      const stored = await row<{ target_date: string }>(
        `SELECT to_char(target_date, 'YYYY-MM-DD') AS target_date FROM goals WHERE id = $1`,
        [created.id],
      );
      expect(stored?.target_date).toBe('2027-03-31');

      await as(alice)
        .patch(`/api/goals/${created.id}`, {
          status: 'PAUSED',
          targetDate: null,
        })
        .expect(200);
      const list = (await as(alice).get('/api/goals?status=PAUSED').expect(200))
        .body as GoalResponse[];
      expect(list.map((g) => g.id)).toContain(created.id);

      await as(alice).delete(`/api/goals/${created.id}`).expect(204);
      await as(alice).get(`/api/goals/${created.id}`).expect(404);
    });

    it("another user's goal is a 404 and is never listed", async () => {
      const goal = (
        await as(alice).post('/api/goals', { title: 'Private' }).expect(201)
      ).body as GoalResponse;

      await as(bob).get(`/api/goals/${goal.id}`).expect(404);
      await as(bob).patch(`/api/goals/${goal.id}`, { title: 'x' }).expect(404);
      await as(bob).delete(`/api/goals/${goal.id}`).expect(404);
      const bobs = (await as(bob).get('/api/goals').expect(200))
        .body as GoalResponse[];
      expect(bobs.map((g) => g.id)).not.toContain(goal.id);
    });

    it('rejects an impossible targetDate', async () => {
      await as(alice)
        .post('/api/goals', { title: 'G', targetDate: '2027-02-30' })
        .expect(400);
    });
  });

  it('deleting a user cascades to their projects, tasks and goals', async () => {
    const carol = await signUp();
    const project = await createProject(carol);
    await createTask(carol, { projectId: project.id });
    await createTask(carol);
    await as(carol).post('/api/goals', { title: 'G' }).expect(201);

    await db.query('DELETE FROM users WHERE id = $1', [carol.id]);

    const counts = await row<Record<string, number>>(
      `SELECT
         (SELECT count(*)::int FROM projects WHERE owner_id = $1) AS projects,
         (SELECT count(*)::int FROM tasks    WHERE owner_id = $1) AS tasks,
         (SELECT count(*)::int FROM goals    WHERE owner_id = $1) AS goals`,
      [carol.id],
    );
    expect(counts).toEqual({ projects: 0, tasks: 0, goals: 0 });
  });
});
