# NEXUS

**Personal Context & Action Engine.** NEXUS connects a user's projects, tasks,
goals, documents, calendar, email, GitHub activity and other sources into a
unified context layer, then helps turn that information into action.

> **Status: Phase 2 — database foundation.** Monorepo, apps, shared packages,
> local infrastructure, and a migration-based PostgreSQL layer (TypeORM) with a
> minimal `User` entity. No auth, AI or product features yet.

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
cp .env.example .env      # set DATABASE_PASSWORD (and ports, if needed); never commit .env
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
  users/user.entity.ts    User entity (id, email, createdAt, updatedAt)
```

## Shared packages

- `@nexus/types` is compiled to `dist/` so the Node runtime (API) can import it.
  Root `dev`, `typecheck` and `test` build it first; `pnpm dev` keeps it in
  watch mode.
- `@nexus/ui` ships TypeScript source and is compiled by Next.js via
  `transpilePackages`. Tailwind scans it through `@source` in `globals.css`.
- `@nexus/config` exposes `tsconfig/{base,library,react-library,nextjs,nestjs}.json`,
  `eslint/base` and `prettier`.
