# Architecture — Local Development

**Last updated:** 2026-05-28

Tudo que você precisa pra subir o projeto localmente. Consolida info que estava espalhada
entre [CLAUDE.md](../../CLAUDE.md), [docker-compose.yml](../../docker-compose.yml),
[apps/api/.env.example](../../apps/api/.env.example) e [turbo.json](../../turbo.json).

## Pre-requisites

| Tool | Version | Por quê |
|------|---------|---------|
| Node | `>=18` | Declarado em [package.json](../../package.json) (`engines`) |
| pnpm | `8.15.5` | Pinado em [package.json](../../package.json) (`packageManager`) — instale via `corepack` |
| Docker | qualquer recente | Postgres local roda em container |

```powershell
corepack enable
corepack prepare pnpm@8.15.5 --activate
```

## Initial setup (passo-a-passo)

```powershell
# 1. Instalar deps
pnpm install

# 2. Subir Postgres
docker compose up -d

# 3. Configurar env vars do api
Copy-Item apps/api/.env.example apps/api/.env

# 4. Rodar migrations (cria as tabelas no Postgres)
pnpm --filter=api db:migrate

# 5. Subir todos os apps em paralelo
pnpm dev
```

Após isso:
- web: <http://localhost:3000>
- docs: <http://localhost:3001>
- api: <http://localhost:3333> (teste com `GET /health`)
- Postgres: `localhost:5433`

## Portas em uso

| Serviço | Porta host | Porta interna | Onde |
|---------|------------|---------------|------|
| `web` (Next.js) | 3000 | 3000 | [apps/web/package.json](../../apps/web/package.json) `dev` script |
| `docs` (Next.js) | 3001 | 3001 | [apps/docs/package.json](../../apps/docs/package.json) `dev` script |
| `api` (Fastify) | 3333 | 3333 | [apps/api/src/env.ts](../../apps/api/src/env.ts) (default em `PORT`) |
| Postgres | **5433** | 5432 | [docker-compose.yml](../../docker-compose.yml) — não 5432 pra evitar conflito com Postgres local |

## Environment variables

Validadas via Zod em [apps/api/src/env.ts](../../apps/api/src/env.ts). Fail-fast no startup:
qualquer var ausente/inválida lança erro antes do servidor subir.

| Variável | Consumida por | Default | Onde declarada |
|----------|---------------|---------|----------------|
| `DATABASE_URL` | `api` (Prisma + Fastify) | — (required) | [turbo.json](../../turbo.json) tasks `dev`, `db:migrate`; [apps/api/.env.example](../../apps/api/.env.example) |
| `PORT` | `api` | `3333` | [turbo.json](../../turbo.json) task `dev`; [apps/api/.env.example](../../apps/api/.env.example) |
| `NODE_ENV` | `api` (logs do Prisma) | `development` | [turbo.json](../../turbo.json) task `dev` |

> **Importante:** se você acessar uma env var no código, ela **precisa** estar declarada em
> [turbo.json](../../turbo.json) (`env` ou `passThroughEnv`). O ESLint rule `turbo/no-undeclared-env-vars`
> falha o lint caso contrário.

### `.env` files

| Arquivo | Status | Conteúdo |
|---------|--------|----------|
| `apps/api/.env.example` | versionado | Template — copie para `.env` |
| `apps/api/.env` | **ignorado** | Seu env real — não commitar |

### Carregamento do `.env` no Prisma

Prisma 7 **não auto-carrega** `.env` quando há [`prisma.config.ts`](../../apps/api/prisma.config.ts).
O config file injeta o `.env` manualmente antes do `defineConfig`, garantindo que
`prisma migrate` e `prisma generate` encontrem `DATABASE_URL`.

## Postgres local

Configurado em [docker-compose.yml](../../docker-compose.yml):

| Item | Valor |
|------|-------|
| Container | `next-saas-pg` |
| Image | `postgres:16` |
| User / password | `docker` / `docker` |
| Database | `next-saas` |
| Volume | `next_saas_pg_data` (persiste entre restarts) |
| Auth method | `trust` (apenas dev local) |

### Operações comuns

```powershell
# Start (background)
docker compose up -d

# Stop (mantém volume — dados preservados)
docker compose stop

# Stop + remover container (mantém volume)
docker compose down

# Reset completo (apaga o volume também)
docker compose down -v
pnpm --filter=api db:migrate  # recria do zero
```

## Commands by workflow

### Dev

```powershell
pnpm dev                           # todos os apps em paralelo
pnpm --filter=web dev              # só o web
pnpm --filter=api dev              # só o api
pnpm --filter=docs dev             # só o docs
```

### Database

```powershell
pnpm --filter=api db:generate      # gera Prisma client (rodado pelo Turbo antes de check-types)
pnpm --filter=api db:migrate       # rodar migrations pendentes (dev)
pnpm --filter=api db:studio        # abre Prisma Studio (GUI no :5555)
```

### Quality

```powershell
pnpm lint                          # ESLint --max-warnings 0 em tudo
pnpm check-types                   # tsc --noEmit em tudo (após db:generate)
pnpm format                        # Prettier write em **/*.{ts,tsx,css,md}
pnpm build                         # turbo build (Next.js builds)
```

## Troubleshooting

| Problema | Causa | Solução |
|---|---|---|
| `Error: connect ECONNREFUSED 127.0.0.1:5433` | Container Postgres não tá rodando | `docker compose up -d` |
| `Environment variable not found: DATABASE_URL` em `prisma migrate` | `.env` não copiado de `.env.example` | Copiar e rodar de novo |
| Lint falha com `no-undeclared-env-vars` | Var nova no código sem declarar em turbo.json | Adicionar em `tasks.<task>.env` ou `globalEnv` |
| Porta 5432 ocupada | Postgres local instalado na máquina | Usamos `5433` no host justamente por isso — verifique a `DATABASE_URL` |
| `next typegen` falha | Arquivo de rota inválido | Rodar `pnpm --filter=web dev` para ver o erro exato |
| Hot-reload lento em `@saas/ui` | Cache do Next | `rm -rf apps/web/.next` |

## Related docs

- [monorepo-overview.md](monorepo-overview.md) — Turbo task graph completo
- [../specs/2026-05-28-api-fastify-prisma-setup.md](../specs/2026-05-28-api-fastify-prisma-setup.md) — spec original do setup da API
- [../../CLAUDE.md](../../CLAUDE.md) — comandos resumidos
