# NEXUS

**Personal Context & Action Engine.** NEXUS connects a user's projects, tasks,
goals, documents, calendar, email, GitHub activity and other sources into a
unified context layer, then helps turn that information into action.

> **Status: Phase 1 — foundation only.** Monorepo, apps, shared packages and
> local infrastructure. No database layer, auth, AI or product features yet.

## Stack

| Layer          | Technology                                                 |
| -------------- | ---------------------------------------------------------- |
| Web            | Next.js 16 (App Router), React 19, TypeScript, Tailwind v4 |
| API            | NestJS 12, TypeScript (TypeORM arrives with the DB layer)  |
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
cp .env.example .env      # adjust values; never commit .env
pnpm install
pnpm docker:up            # start PostgreSQL + Redis
pnpm dev                  # builds shared packages, then runs web + api in watch mode
```

Then open http://localhost:3000. The page shows whether the API is reachable
(`GET http://localhost:4000/api/health`).

## Scripts (run from the repo root)

| Script           | What it does                                                    |
| ---------------- | --------------------------------------------------------------- |
| `pnpm dev`       | Build shared packages, then run all apps/packages in watch mode |
| `pnpm dev:web`   | Run only the web app                                            |
| `pnpm dev:api`   | Run only the API                                                |
| `pnpm build`     | Production build of every package (dependency order)            |
| `pnpm lint`      | ESLint across the workspace (`lint:fix` to autofix)             |
| `pnpm typecheck` | `tsc --noEmit` across the workspace                             |
| `pnpm test`      | Unit tests                                                      |
| `pnpm test:e2e`  | API end-to-end tests                                            |
| `pnpm format`    | Format everything with Prettier (`format:check` for CI)         |
| `pnpm clean`     | Remove build output                                             |
| `pnpm docker:up` | Start PostgreSQL + Redis (`docker:down`, `docker:logs`)         |

Run a script in one package with `pnpm --filter @nexus/<name> <script>`.

## Environment

All configuration lives in a single root `.env` (template: `.env.example`).
The API reads it via `@nestjs/config` (validated at startup in
`apps/api/src/config/env.ts`); the web app loads it in `next.config.ts`;
Docker Compose reads it via `--project-directory .`.

**Port conflicts:** if you already run PostgreSQL or Redis locally, set e.g.
`POSTGRES_PORT=5433` and `REDIS_PORT=6380` in `.env` (and update
`DATABASE_URL` / `REDIS_URL` to match). Compose binds to `127.0.0.1` only.

## Shared packages

- `@nexus/types` is compiled to `dist/` so the Node runtime (API) can import it.
  Root `dev`, `typecheck` and `test` build it first; `pnpm dev` keeps it in
  watch mode.
- `@nexus/ui` ships TypeScript source and is compiled by Next.js via
  `transpilePackages`. Tailwind scans it through `@source` in `globals.css`.
- `@nexus/config` exposes `tsconfig/{base,library,react-library,nextjs,nestjs}.json`,
  `eslint/base` and `prettier`.
