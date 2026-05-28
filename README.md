# Next SaaS RBAC

Monorepo for studying and building a SaaS application with Next.js, a Fastify REST API, and role-based access control.

## Apps

| App | Description | Port |
|-----|-------------|------|
| `apps/web` | Main SaaS application (Next.js) | 3000 |
| `apps/api` | REST API (Fastify + Prisma) | 3333 |
| `apps/docs` | Documentation site (Next.js) | 3001 |

## Packages

| Package | Description |
|---------|-------------|
| `packages/auth` | `@saas/auth` — CASL-based RBAC library |
| `packages/ui` | `@saas/ui` — shared React component library |
| `packages/eslint-config` | `@saas/eslint-config` — shared ESLint flat configs |
| `packages/typescript-config` | `@saas/typescript-config` — shared tsconfig bases |

## Tech Stack

- **Next.js 16** + **React 19** (web and docs)
- **Fastify 5** + **fastify-type-provider-zod** (api)
- **Prisma 7** + `@prisma/adapter-pg` (api)
- **PostgreSQL 16** via Docker
- **Zod v4** — env and route schema validation
- **TypeScript 5.9**
- **pnpm** + **Turborepo**
- **ESLint** (flat config) + **Prettier**

## Getting Started

### 1. Start the database

```bash
docker compose up -d
```

### 2. Install dependencies

```bash
pnpm install
```

### 3. Configure environment

```bash
cp apps/api/.env.example apps/api/.env
```

### 4. Run database migrations

```bash
pnpm --filter=api db:migrate
```

### 5. Start all apps in dev mode

```bash
pnpm dev
```

Or a single app:

```bash
pnpm --filter=web dev
pnpm --filter=api dev
```

## Common Commands

```bash
# Build all
pnpm build

# Lint (0 warnings allowed)
pnpm lint

# Type check
pnpm check-types

# Format
pnpm format

# Prisma (api)
pnpm --filter=api db:migrate   # run migrations
pnpm --filter=api db:generate  # regenerate client
pnpm --filter=api db:studio    # open Prisma Studio
```

## Project Structure

```
apps/
  api/          # Fastify REST API
  docs/         # Docs site
  web/          # Main SaaS app
packages/
  eslint-config/
  typescript-config/
  ui/
docker-compose.yml  # Postgres 16
```

## Environment Variables

### `apps/api/.env`

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://docker:docker@localhost:5433/next-saas?schema=public&sslmode=disable` |
| `PORT` | API server port | `3333` |
| `NODE_ENV` | Runtime environment | `development` |

## Documentation

In-depth docs (architecture, domain model, RBAC matrix, ADRs, specs) live in [docs/](docs/). Start at [docs/README.md](docs/README.md).
