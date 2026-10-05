# NEXUS

**Personal Context & Action Engine.** NEXUS connects a user's projects, tasks,
goals, documents, calendar, email, GitHub activity and other sources into a
unified context layer, then helps turn that information into action.

> **Status: Phase 3 — authentication.** Monorepo, apps, shared packages,
> local infrastructure, a migration-based PostgreSQL layer (TypeORM), and
> email/password authentication (JWT access tokens + rotating refresh tokens).
> No AI, integrations or product features yet.

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

## Shared packages

- `@nexus/types` is compiled to `dist/` so the Node runtime (API) can import it.
  Root `dev`, `typecheck` and `test` build it first; `pnpm dev` keeps it in
  watch mode.
- `@nexus/ui` ships TypeScript source and is compiled by Next.js via
  `transpilePackages`. Tailwind scans it through `@source` in `globals.css`.
- `@nexus/config` exposes `tsconfig/{base,library,react-library,nextjs,nestjs}.json`,
  `eslint/base` and `prettier`.
