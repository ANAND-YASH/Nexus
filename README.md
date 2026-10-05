# NEXUS

**Personal Context & Action Engine.** NEXUS connects a user's projects, tasks,
goals, documents, calendar, email, GitHub activity and other sources into a
unified context layer, then helps turn that information into action.

> **Status: Phase 7 — context graph.** Monorepo, apps, shared packages,
> local infrastructure, a migration-based PostgreSQL layer (TypeORM),
> email/password authentication, projects/tasks/goals, a document knowledge
> layer with full-text search, asynchronous AI document analysis, and a
> per-user context graph (entities, typed relationships with provenance,
> depth-1 context, AI relationship candidates).
> No embeddings, RAG, chat, integrations or UI for these yet.

## Stack

| Layer          | Technology                                                 |
| -------------- | ---------------------------------------------------------- |
| Web            | Next.js 16 (App Router), React 19, TypeScript, Tailwind v4 |
| API            | NestJS 12, TypeScript, TypeORM 1.x (migrations only)       |
| Database       | PostgreSQL 17 (Docker)                                     |
| Cache / queues | Redis 7 (Docker)                                           |
| Tooling        | pnpm workspaces, ESLint 9 (flat config), Prettier, Jest    |

## Repository layout

```
apps/
  web/        Next.js app            → http://localhost:3000
  api/        NestJS API             → http://localhost:4000/api
packages/
  types/      Shared TS contracts (compiled with tsc → dist/, used by web + api)
  ui/         Shared React components (TS source, transpiled by Next.js)
  config/     Shared tsconfig bases, ESLint base config, Prettier config
docker/
  docker-compose.yml   PostgreSQL + Redis for local development
```

## Prerequisites

- **Node.js ≥ 22.12** (24 LTS recommended — see `.nvmrc`). Enforced via
  `engine-strict`; NestJS 12 is ESM-only and needs a modern Node.
- **pnpm ≥ 10.12**
- **Docker** (for PostgreSQL / Redis)

## Getting started

```bash
cp .env.example .env      # set DATABASE_PASSWORD and both JWT_* secrets; never commit .env
pnpm install
pnpm docker:up            # start PostgreSQL + Redis
pnpm db:migration:run     # create the schema
pnpm dev                  # builds shared packages, then runs web + api in watch mode
```

Then open http://localhost:3000. The page shows whether the API and its
database are reachable (`GET http://localhost:4000/api/health`).

## Scripts (run from the repo root)

| Script           | What it does                                                    |
| ---------------- | --------------------------------------------------------------- |
| `pnpm dev`       | Build shared packages, then run all apps/packages in watch mode |
| `pnpm dev:web`   | Run only the web app                                            |
| `pnpm dev:api`   | Run only the API                                                |
| `pnpm build`     | Production build of every package (dependency order)            |
| `pnpm lint`      | ESLint across the workspace (`lint:fix` to autofix)             |
| `pnpm typecheck` | `tsc --noEmit` across the workspace                             |
| `pnpm test`      | Unit tests (no database needed)                                 |
| `pnpm test:e2e`  | API end-to-end tests (needs PostgreSQL + migrations applied)    |
| `pnpm format`    | Format everything with Prettier (`format:check` for CI)         |
| `pnpm clean`     | Remove build output                                             |
| `pnpm docker:up` | Start PostgreSQL + Redis (`docker:down`, `docker:logs`)         |
| `pnpm db:*`      | Database migrations — see [Database](#database)                 |

Run a script in one package with `pnpm --filter @nexus/<name> <script>`.

## Environment

All configuration lives in a single root `.env` (template: `.env.example`).
The API reads it via `@nestjs/config` (validated at startup in
`apps/api/src/config/env.ts`); the web app loads it in `next.config.ts`;
Docker Compose reads it via `--project-directory .`.

**Port conflicts:** if you already run PostgreSQL or Redis locally, set e.g.
`DATABASE_PORT=5433` and `REDIS_PORT=6380` in `.env` (and update `REDIS_URL`
to match). Compose binds to `127.0.0.1` only.

## Database

PostgreSQL 17 runs in Docker; the API talks to it through TypeORM.
`synchronize` is **off** — every schema change is a reviewed migration.

### 1. Configure

Set these in the root `.env` (all required — the API, the migration CLI and
`docker compose` refuse to start without them):

| Variable            | Example     | Notes                                           |
| ------------------- | ----------- | ----------------------------------------------- |
| `DATABASE_HOST`     | `localhost` |                                                 |
| `DATABASE_PORT`     | `5432`      | Also the host port Docker publishes Postgres on |
| `DATABASE_USER`     | `nexus`     |                                                 |
| `DATABASE_PASSWORD` | —           | Choose your own; no default is provided         |
| `DATABASE_NAME`     | `nexus`     |                                                 |

Docker initialises the container from the same variables **on first start
only**. If you change the user/password/name later, recreate the volume:
`pnpm docker:down -v && pnpm docker:up` (this deletes local data).

### 2. Start PostgreSQL

```bash
pnpm docker:up
pnpm docker:logs           # optional: follow logs (Ctrl+C to stop)
```

### 3. Run migrations

| Command                             | What it does                                                                  |
| ----------------------------------- | ----------------------------------------------------------------------------- |
| `pnpm db:migration:run`             | Apply all pending migrations                                                  |
| `pnpm db:migration:show`            | List migrations (`[X]` = applied)                                             |
| `pnpm db:migration:revert`          | Revert the **most recent** applied migration (run again to step back further) |
| `pnpm db:migration:generate <Name>` | Diff entities against the database and write a migration                      |
| `pnpm db:migration:create <Name>`   | Create an empty migration to fill in by hand                                  |

Migrations live in `apps/api/src/database/migrations/` and are recorded in the
`typeorm_migrations` table. Typical workflow for a schema change:

1. Edit or add an entity (register new entities in `src/database/database.options.ts`).
2. `pnpm db:migration:generate AddSomething` — review the generated SQL.
3. `pnpm db:migration:run`, then commit the entity and migration together.

In production, run migrations from the compiled build (no ts-node):
`pnpm --filter @nexus/api db:migration:run:prod` after `pnpm build`.

### 4. Check database health

```bash
curl -i http://localhost:4000/api/health       # readiness: API + database
curl -i http://localhost:4000/api/health/live  # liveness: API process only
```

`/api/health` returns **200** when everything is up and **503** when the
database is unreachable, with per-check status (no connection details):

```json
{
  "status": "ok",
  "service": "nexus-api",
  "checks": {
    "api": { "status": "up" },
    "database": { "status": "up", "latencyMs": 2 }
  }
}
```

Use `/api/health/live` for liveness probes (restart on failure) and
`/api/health` for readiness probes (stop routing traffic on failure).

### Layout

```
apps/api/src/
  database/
    database.options.ts   Connection options shared by Nest and the CLI
    database.module.ts    TypeOrmModule wiring (reads validated config)
    data-source.ts        DataSource for the TypeORM CLI
    migrations/           Migration files
  users/user.entity.ts    User entity (id, email, passwordHash, createdAt, updatedAt)
  auth/sessions/          RefreshSession entity (hashed refresh tokens)
  projects/ tasks/ goals/ Domain modules (entity, DTOs, service, controller)
  documents/              Documents, links to projects/tasks/goals, search
  ai/                     AI provider abstraction (OpenAI) + document analysis
  context/                Context graph: entities, relationships, context, candidates
```

## Authentication

Email/password accounts with short-lived JWT **access tokens** and long-lived,
single-use **refresh tokens**. No auth UI, OAuth, email verification, password
reset or 2FA yet.

### Required environment variables

| Variable                 | Example | Notes                                              |
| ------------------------ | ------- | -------------------------------------------------- |
| `JWT_ACCESS_SECRET`      | —       | ≥ 32 chars. `openssl rand -base64 48`              |
| `JWT_REFRESH_SECRET`     | —       | ≥ 32 chars, **must differ** from the access secret |
| `JWT_ACCESS_EXPIRES_IN`  | `15m`   | Seconds or `s`/`m`/`h`/`d`. Keep it short          |
| `JWT_REFRESH_EXPIRES_IN` | `7d`    | Must be longer than the access lifetime            |

The API refuses to start if any is missing or invalid. The migration CLI only
needs the `DATABASE_*` variables.

### How it works

- **Passwords** are hashed with **argon2id** (19 MiB, 2 iterations — OWASP
  baseline) and stored as `users.password_hash`. The column is excluded from
  queries by default and never appears in responses or logs.
- **Access token**: HS256 JWT with only `sub` (user id), `iat`, `exp`, `iss`,
  `aud`. Sent as `Authorization: Bearer <token>`. Stateless — it stays valid
  until it expires (there is no blacklist), which is why it is short-lived.
- **Refresh token**: HS256 JWT signed with a _separate_ secret and audience,
  carrying `sub` and `sid` (its session id). The database stores only its
  **SHA-256 hash** in `refresh_sessions`, never the token itself.
  - **Rotation**: every `POST /auth/refresh` revokes the presented session and
    issues a new access + refresh pair. Each refresh token works **once**.
  - **Reuse detection**: presenting a revoked token — one already rotated or
    logged out — is treated as theft: **all** of that user's sessions are
    revoked and they must log in again. Clients must therefore always replace
    their stored refresh token with the new one and never retry with the old.
  - **Concurrency**: revocation is a single conditional `UPDATE`, so two
    simultaneous refreshes with the same token can't both succeed.
- **Transport**: tokens travel in JSON bodies/headers (no cookies yet). Clients
  must store the refresh token securely; a browser client should move it to an
  `httpOnly` cookie when the web auth UI is built.
- **Secure by default**: a global guard requires a valid access token on every
  route. Routes opt out explicitly with `@Public()` (currently: health
  endpoints, register, login, refresh, logout). Read the caller with
  `@CurrentUser()`.

### Endpoints

All under `http://localhost:4000/api`. Request bodies are validated; unknown
fields are rejected with **400**.

| Method & path         | Auth          | Success                                       | Errors                                         |
| --------------------- | ------------- | --------------------------------------------- | ---------------------------------------------- |
| `POST /auth/register` | —             | **201** `{ user, accessToken, refreshToken }` | 400 invalid input, 409 email taken             |
| `POST /auth/login`    | —             | **200** `{ user, accessToken, refreshToken }` | 400 invalid input, 401 bad credentials         |
| `POST /auth/refresh`  | refresh token | **200** `{ accessToken, refreshToken }`       | 400 missing token, 401 invalid/expired/revoked |
| `POST /auth/logout`   | refresh token | **204** (idempotent)                          | 400 missing token, 401 invalid token           |
| `GET /auth/me`        | access token  | **200** `{ id, email, createdAt, updatedAt }` | 401 missing/invalid/expired token              |

Passwords must be 8–128 characters. Login failures always return the same
`401 Invalid email or password.` whether or not the email exists.

### Examples

```bash
API=http://localhost:4000/api

# Register (201)
curl -s -X POST $API/auth/register -H 'Content-Type: application/json' \
  -d '{"email":"ada@example.com","password":"correct horse battery staple"}'
# → {"user":{"id":"…","email":"ada@example.com","createdAt":"…","updatedAt":"…"},
#    "accessToken":"eyJ…","refreshToken":"eyJ…"}

# Login (200) — same response shape as register
curl -s -X POST $API/auth/login -H 'Content-Type: application/json' \
  -d '{"email":"ada@example.com","password":"correct horse battery staple"}'

# Current user (200)
curl -s $API/auth/me -H "Authorization: Bearer $ACCESS_TOKEN"
# → {"id":"…","email":"ada@example.com","createdAt":"…","updatedAt":"…"}

# Refresh (200) — the old refresh token is now dead; store the new pair
curl -s -X POST $API/auth/refresh -H 'Content-Type: application/json' \
  -d "{\"refreshToken\":\"$REFRESH_TOKEN\"}"
# → {"accessToken":"eyJ…","refreshToken":"eyJ…"}

# Logout (204) — revokes that refresh session
curl -s -o /dev/null -w '%{http_code}\n' -X POST $API/auth/logout \
  -H 'Content-Type: application/json' -d "{\"refreshToken\":\"$REFRESH_TOKEN\"}"
```

### Not yet implemented (later phases)

Rate limiting on login/register (needs a shared store such as Redis for
multiple instances), periodic cleanup of expired `refresh_sessions` rows,
cookie-based token transport for the web app, email verification, password
reset, OAuth and 2FA.

## Projects, tasks & goals

Per-user domain records. Every endpoint requires
`Authorization: Bearer <access token>` and only ever sees the caller's own
records. After pulling this phase, run `pnpm db:migration:run`; no new
environment variables are needed.

### Model

| Entity    | Fields                                                                                                                       | Enums                                                                                                    |
| --------- | ---------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| `Project` | `id`, `name` (≤200), `description?`, `status`, `createdAt`, `updatedAt`                                                      | status `ACTIVE` · `COMPLETED` · `ARCHIVED`                                                               |
| `Task`    | `id`, `projectId?`, `title` (≤200), `description?`, `status`, `priority`, `dueAt?`, `completedAt?`, `createdAt`, `updatedAt` | status `TODO` · `IN_PROGRESS` · `COMPLETED` · `CANCELLED`; priority `LOW` · `MEDIUM` · `HIGH` · `URGENT` |
| `Goal`    | `id`, `title` (≤200), `description?`, `status`, `targetDate?` (`YYYY-MM-DD`), `createdAt`, `updatedAt`                       | status `ACTIVE` · `COMPLETED` · `PAUSED` · `ARCHIVED`                                                    |

Defaults: project/goal `ACTIVE`, task `TODO` + `MEDIUM`. Descriptions ≤ 10,000
characters. Timestamps are ISO 8601 in UTC; `dueAt` must include a timezone
(`Z` or `±hh:mm`). Enums and request/response types are exported from
`@nexus/types`.

### Endpoints

Each resource exposes the same five routes:

| Method & path                | Success                     | Notes                                                    |
| ---------------------------- | --------------------------- | -------------------------------------------------------- |
| `POST /api/{resource}`       | **201** created record      |                                                          |
| `GET /api/{resource}`        | **200** array, newest first | Filters below; unknown params → 400                      |
| `GET /api/{resource}/:id`    | **200** record              | 404 if missing _or not yours_                            |
| `PATCH /api/{resource}/:id`  | **200** updated record      | Omitted fields unchanged; `null` clears a nullable field |
| `DELETE /api/{resource}/:id` | **204**                     | 404 if missing _or not yours_                            |

`{resource}` is `projects`, `tasks` or `goals`. Filters (combinable):

- `GET /api/projects?status=ACTIVE`
- `GET /api/tasks?status=TODO&priority=HIGH&projectId=<uuid>`
- `GET /api/goals?status=PAUSED`

Errors: **400** invalid body/query/UUID (including unknown fields such as
`ownerId` or `completedAt`), **401** missing/invalid token, **404** not found.

### Rules

- **Ownership** comes from the access token only — `ownerId` is never
  accepted from the client. Another user's record returns the same 404 as a
  missing one, so its existence is never revealed.
- **Task → project**: `projectId` must be one of _your_ projects (else 404
  `Project not found.`). The database enforces this too, with a composite
  foreign key `(project_id, owner_id) → projects (id, owner_id)`.
- **`completedAt` is server-managed**: set when a task becomes `COMPLETED`,
  kept while it stays completed, cleared when it moves to any other status.
  A database CHECK keeps the two consistent.
- **Deletes**: deleting a project keeps its tasks and sets their `projectId` to
  `null`. Deleting a user deletes their projects, tasks and goals.

### Examples

```bash
API=http://localhost:4000/api
AUTH="Authorization: Bearer $ACCESS_TOKEN"

curl -s -X POST $API/projects -H "$AUTH" -H 'Content-Type: application/json' \
  -d '{"name":"Website relaunch","description":"Q4 refresh"}'
# → 201 {"id":"…","name":"Website relaunch","description":"Q4 refresh",
#        "status":"ACTIVE","createdAt":"…","updatedAt":"…"}

curl -s -X POST $API/tasks -H "$AUTH" -H 'Content-Type: application/json' \
  -d '{"title":"Draft copy","projectId":"<project id>","priority":"HIGH","dueAt":"2026-11-01T17:00:00Z"}'

curl -s -X PATCH $API/tasks/<task id> -H "$AUTH" -H 'Content-Type: application/json' \
  -d '{"status":"COMPLETED"}'          # → completedAt is set by the server

curl -s "$API/tasks?status=TODO&priority=HIGH" -H "$AUTH"

curl -s -X POST $API/goals -H "$AUTH" -H 'Content-Type: application/json' \
  -d '{"title":"Run a half marathon","targetDate":"2027-04-18"}'
```

## Documents

Text documents owned by a user — the knowledge layer later phases will build
AI understanding and search on. Content is stored as text in PostgreSQL; there
are no file uploads, object storage, embeddings or AI yet. After pulling this
phase, run `pnpm db:migration:run`; no new environment variables are needed.

### Model

| Field           | Type / limits                                                                                                              |
| --------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `title`         | required, trimmed, ≤ 300 chars                                                                                             |
| `content`       | required, not blank, ≤ 200,000 chars, stored verbatim                                                                      |
| `mimeType`      | required `type/subtype` (no parameters), stored lowercase                                                                  |
| `sourceType`    | required: `MANUAL` · `UPLOAD` · `IMPORT` · `URL`                                                                           |
| `sourceUrl`     | optional `http(s)` URL ≤ 2048 chars; URLs with `user:pass@` are rejected                                                   |
| `fileName`      | optional, ≤ 255 chars                                                                                                      |
| `fileSizeBytes` | optional integer ≥ 0 (metadata only)                                                                                       |
| `checksum`      | optional hex digest, 32–128 chars (e.g. SHA-256), stored lowercase. Metadata only — not computed or used for deduplication |

`ownerId`, `id` and timestamps are never accepted from clients (400). JSON
request bodies may be up to 1 MB (raised from Express's 100 kB default to fit
the content limit).

### Endpoints

All require `Authorization: Bearer <access token>`. Another user's document
(or project/task/goal) returns the same 404 as a missing one.

| Method & path                                    | Success                                                                                                |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------------------ |
| `POST /api/documents`                            | **201** document (with content)                                                                        |
| `GET /api/documents`                             | **200** summaries (no `content`), newest first                                                         |
| `GET /api/documents/:id`                         | **200** document + `projectIds`, `taskIds`, `goalIds`                                                  |
| `PATCH /api/documents/:id`                       | **200** document. Omitted = unchanged; `null` clears `sourceUrl`/`fileName`/`fileSizeBytes`/`checksum` |
| `DELETE /api/documents/:id`                      | **204**; its links are removed, linked records are kept                                                |
| `POST /api/documents/:id/projects/:projectId`    | **204**, idempotent (linking twice keeps one link)                                                     |
| `DELETE /api/documents/:id/projects/:projectId`  | **204**; 404 if not linked                                                                             |
| `POST`/`DELETE /api/documents/:id/tasks/:taskId` | same as projects                                                                                       |
| `POST`/`DELETE /api/documents/:id/goals/:goalId` | same as projects                                                                                       |

Linking requires both the document and the target to be yours. The database
enforces this as well: each `document_*` link row has composite foreign keys
`(document_id, owner_id)` and `(target_id, owner_id)` sharing one `owner_id`.
Deleting a project, task or goal removes its links but never the document.

### Listing and search

```
GET /api/documents?sourceType=UPLOAD
GET /api/documents?mimeType=application/pdf
GET /api/documents?search=refresh tokens
GET /api/documents?search="exact phrase" -excluded&sourceType=MANUAL
```

- Filters combine; results are always limited to the caller's documents.
- `search` (≤ 200 chars) uses **PostgreSQL full-text search** over title +
  content with the `english` configuration: case-insensitive, stemmed
  (`authentication` matches `authenticating`), stop words ignored, web-search
  syntax (`"phrases"`, `-exclude`, `or`). It is not substring matching
  (`auth` does not match `authentication`). Input is only ever a bound query
  parameter. A GIN expression index (`IDX_documents_search`) backs it.
- Results are ordered newest first (not by relevance), and **lists are not
  paginated yet** — pagination is required before production-scale use.

### Examples

```bash
API=http://localhost:4000/api
AUTH="Authorization: Bearer $ACCESS_TOKEN"

curl -s -X POST $API/documents -H "$AUTH" -H 'Content-Type: application/json' \
  -d '{"title":"Auth design","content":"We rotate refresh tokens…","mimeType":"text/markdown","sourceType":"MANUAL"}'

curl -s -o /dev/null -w '%{http_code}\n' -X POST "$API/documents/<doc id>/projects/<project id>" -H "$AUTH"   # 204

curl -s "$API/documents/<doc id>" -H "$AUTH"
# → {…, "content":"…", "projectIds":["<project id>"], "taskIds":[], "goalIds":[]}

curl -s "$API/documents?search=refresh%20tokens" -H "$AUTH"
```

## AI document analysis

Asynchronous, structured analysis of a document's title and content: a
summary, key points, topics, entities, suggested action items and important
dates. Results are **insight only** — NEXUS never creates tasks or performs
any other action from them.

```
POST /analyze → document_ai_analysis row (PENDING) → BullMQ "document-analysis"
  → worker (in the API process) → OpenAI structured output → validated → COMPLETED / FAILED
```

### Enable it

It is off by default (no Redis connection, no AI provider; `POST …/analyze`
returns 503). To enable:

```bash
# .env
AI_DOCUMENT_ANALYSIS_ENABLED=true
OPENAI_API_KEY=sk-…                     # never commit
AI_DOCUMENT_ANALYSIS_MODEL=gpt-4o-mini  # any Responses-API model with structured outputs
REDIS_URL=redis://localhost:6379        # match REDIS_PORT if you changed it

pnpm docker:up && pnpm db:migration:run && pnpm dev:api
```

When enabled, the API refuses to start if `OPENAI_API_KEY` or `REDIS_URL` is
missing, or if the key doesn't look like an OpenAI key (`sk-…`). Neither
value is ever logged or echoed.

### Endpoints

Both require `Authorization: Bearer <access token>` and are owner-scoped
(another user's document is the same 404 as a missing one).

| Method & path                     | Success                                                           | Errors                                             |
| --------------------------------- | ----------------------------------------------------------------- | -------------------------------------------------- |
| `POST /api/documents/:id/analyze` | **202** analysis (status `PENDING`, or the run already in flight) | 404 document, 503 disabled or queue unavailable    |
| `GET /api/documents/:id/analysis` | **200** current analysis                                          | 404 document, or `Document has not been analyzed.` |

```json
{
  "id": "…",
  "documentId": "…",
  "status": "COMPLETED",
  "model": "gpt-4o-mini",
  "summary": "…",
  "keyPoints": ["…"],
  "topics": ["…"],
  "entities": [{ "name": "Acme", "type": "organization" }],
  "actionItems": [{ "title": "Book venue", "priority": "HIGH" }],
  "importantDates": [{ "date": "2027-03-01", "description": "Launch" }],
  "error": null,
  "createdAt": "…",
  "updatedAt": "…"
}
```

`status` is `PENDING` → `PROCESSING` → `COMPLETED` or `FAILED`; poll the GET
endpoint. Result fields are `null` until `COMPLETED`. On `FAILED`, `error` is
a short user-facing message — never a provider error.

### Behavior

- **One analysis per document.** Re-analysis resets the same record (results
  are cleared until the new run completes). Requesting analysis while a run
  is pending/processing (and updated within the last 10 minutes) returns that
  run instead of starting — and paying for — another.
- **Idempotent jobs.** Each request starts a new run id; the worker only writes
  while its run is current, so duplicate deliveries, retries and superseded
  jobs can't corrupt the record. Concurrent requests can't create a second row
  (unique `(document_id, owner_id)`, upsert).
- **Retries.** 3 attempts with exponential backoff (10 s, 20 s) for rate
  limits, outages and invalid model output; no retry for rejected requests
  (bad key, unknown model, document too long, refusals). Completed jobs are
  kept in Redis for 24 h, failed ones for 7 days.
- **Structured output.** OpenAI strict JSON-schema mode, then validated again
  in the API (types, enums, lengths, real `YYYY-MM-DD` dates) before storing.
  Requests use `store: false`.
- **Prompt-injection hardening.** The document is passed as untrusted data
  inside per-request random delimiters; the instructions forbid following any
  instructions in it. The model has no tools, and its output is only stored.
- **Privacy.** Only title and content are sent. Logs contain document/analysis
  ids and statuses only — never content, prompts, model output or the key.
- **Deletion.** Deleting a document deletes its analysis.
- Swapping providers means binding `DOCUMENT_ANALYZER` to another
  implementation in `ai/ai.module.ts`; nothing else depends on OpenAI.

## Context graph

A per-user graph connecting documents, projects, tasks, goals and **context
entities** through typed, attributed **relationships**. It is the substrate
later phases (AI reasoning, recommendations) will query. After pulling this
phase run `pnpm db:migration:run`; no new environment variables are needed.

### Entities

Named things in a user's world: `PERSON`, `ORGANIZATION`, `PROJECT`,
`TECHNOLOGY`, `LOCATION`, `CONCEPT`. Names are de-duplicated per owner and
type by a normalized form (Unicode NFKC, trimmed, whitespace collapsed,
lowercased): "ACME Corp" and "acme corp" are the same organization; "Acme"
the organization and "Acme" the project are not.

### Relationships and provenance

`source —relationshipType→ target`, where both ends are one of `DOCUMENT`,
`PROJECT`, `TASK`, `GOAL`, `ENTITY`, and the type is one of `RELATED_TO`,
`MENTIONS`, `SUPPORTS`, `DEPENDS_ON`, `BLOCKS`, `PART_OF`, `ASSIGNED_TO`,
`CREATED_BY`, `USES`. Every relationship records **who asserted it**:

| `source` | Meaning                   | Confidence | `sourceDocumentId` |
| -------- | ------------------------- | ---------- | ------------------ |
| `USER`   | Created through the API   | always 1   | optional           |
| `AI`     | Accepted AI candidate     | 0–1        | **required**       |
| `SYSTEM` | Reserved for internal use | 0–1        | optional           |
| `IMPORT` | Reserved for integrations | 0–1        | optional           |

Validation rules (also enforced by CHECK constraints): confidence in 0–1;
USER ⇒ 1; AI ⇒ source document; **no self-relationships** (a resource can't
relate to itself; two different resources of the same type can).
`MENTIONS` must start at a document; `ASSIGNED_TO`/`CREATED_BY` must point at
an entity. A relationship is unique per (owner, source, type, target) — a
database constraint, so concurrent duplicates still produce one row (409).
Deleting the source document deletes the relationships it justified.

### Owner isolation

Every query is scoped to the authenticated user; `ownerId` is never accepted
from clients. Both endpoints (and the source document) must be the caller's —
otherwise the response is the same 404 as for a missing resource, so other
users' resources are never revealed, counted or resolved.

**Polymorphic references.** `source_id`/`target_id` point into five tables,
so PostgreSQL can't enforce them with a foreign key. Instead: (1) creating a
relationship locks both endpoints (owner-scoped `SELECT … FOR KEY SHARE`) in
the same transaction as the insert, so they must exist and be the owner's,
and a concurrent delete waits; (2) an `AFTER DELETE` trigger on each resource
table deletes that resource's relationships. Together, no relationship can
reference a missing or foreign resource.

### API

All endpoints require `Authorization: Bearer <access token>`.

| Method & path                                            | Notes                                                                                                                 |
| -------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `POST /api/context/entities`                             | `{ name, type, description?, metadata? }` → 201; 409 if name+type exists                                              |
| `GET /api/context/entities?type=&search=`                | Summaries (no description/metadata); `search` = case-insensitive substring                                            |
| `GET`/`PATCH`/`DELETE /api/context/entities/:id`         | PATCH: omitted = unchanged, `null` clears description/metadata                                                        |
| `POST /api/context/relationships`                        | `{ sourceType, sourceId, relationshipType, targetType, targetId, sourceDocumentId?, metadata? }` → 201, always `USER` |
| `GET /api/context/relationships`                         | Filters: `sourceType`, `sourceId`, `targetType`, `targetId`, `relationshipType`, `source`                             |
| `DELETE /api/context/relationships/:id`                  | 204                                                                                                                   |
| `GET /api/context/{documents,projects,tasks,goals}/:id`  | Depth-1 context (below)                                                                                               |
| `GET /api/context/entities/:id/context`                  | Depth-1 context of an entity (`/context/entities/:id` is the entity itself)                                           |
| `GET /api/context/documents/:id/candidates`              | AI relationship candidates (not stored)                                                                               |
| `POST /api/context/documents/:id/candidates/:key/accept` | Store one candidate as an `AI` relationship → 201; 409 if it exists                                                   |

`metadata` is a JSON object of at most 4 KB.

### Context (depth 1)

```json
{
  "resource": { "resourceType": "PROJECT", "id": "…", "name": "Launch", "status": "ACTIVE", … },
  "related": {
    "documents": [], "projects": [], "tasks": [], "goals": [], "entities": [],
    "relationships": [ { "sourceType": "PROJECT", "relationshipType": "USES", "targetType": "ENTITY", … } ]
  },
  "truncated": false
}
```

Neighbours are everything one hop away: through graph relationships (either
direction) and through built-in links (document ↔ project/task/goal links,
task → project, a project's tasks). Nodes carry metadata only — never
document content. Each list is capped (100 neighbours per type, 200
relationships; `truncated: true` if a cap was hit).

**Why depth 1.** A fixed, small number of queries per request (resource,
edges, built-in links, then one batched load per resource type — no N+1),
bounded response size and deterministic ordering. Unbounded traversal over a
densely linked personal graph gets expensive and noisy fast; deeper or
weighted traversal can be added deliberately when a use case needs it.

### AI candidates vs. stored relationships

AI-generated relationships are never the source of truth:

```
AI analysis (Phase 6) → candidates (derived on request, never stored)
  → user accepts one → server re-derives + validates it → stored with source AI
```

- Candidates come from a document's **completed** analysis: each extracted
  entity becomes `DOCUMENT —MENTIONS→ entity` with confidence 0.8. Free-form
  entity types are mapped conservatively (unknown types are skipped). No new
  AI call is made and the Phase 6 schema is unchanged.
- AI output never supplies ids — only names and types, resolved owner-scoped
  (an entity is created on acceptance if needed). A UUID in AI output is just
  a name.
- Accepting takes only the candidate `key`; the server regenerates the
  candidate, so clients can't inject confidence, provenance or references.
- Any AI proposal goes through one validation gate: strict shape validation
  (unknown fields, enums, ranges, ids), owner-scoped resolution of every
  reference and of the source document, then the normal relationship rules.
  Accepted relationships keep `source: AI` — they are never relabelled `USER`.

### Why PostgreSQL rather than a graph database

The graph is small per user, always queried within one owner, and only one
hop deep — well served by indexed relational tables (owner-leading indexes on
both edge directions). Keeping it in PostgreSQL gives transactional writes
alongside the resources it references, the same constraints/backup/migration
tooling as the rest of NEXUS, and one less system to operate. A dedicated
graph store (e.g. Neo4j) becomes worth it if multi-hop traversal, path
queries or graph algorithms turn into core features.

## Shared packages

- `@nexus/types` is compiled to `dist/` so the Node runtime (API) can import it.
  Root `dev`, `typecheck` and `test` build it first; `pnpm dev` keeps it in
  watch mode.
- `@nexus/ui` ships TypeScript source and is compiled by Next.js via
  `transpilePackages`. Tailwind scans it through `@source` in `globals.css`.
- `@nexus/config` exposes `tsconfig/{base,library,react-library,nextjs,nestjs}.json`,
  `eslint/base` and `prettier`.
