# Design: `apps/api` — Fastify + Prisma Setup

**Date:** 2026-05-28
**Status:** Implemented — `feat/fastify-api-prisma-setup`, PR [#8](https://github.com/pedrosouza423/next-saas-rbac/pull/8)

## Summary

Bootstrap do app `apps/api`: servidor HTTP Fastify 5 com Zod type provider, Prisma 7 com
`@prisma/adapter-pg` para acesso ao banco, validação de ambiente via Zod, e schema completo do
domínio (Users, Organizations, Projects, Members, Invites, Tokens, Accounts). Inclui infraestrutura
local com Docker Compose (Postgres 16).

## Scope

- **In scope:** servidor Fastify, schema Prisma, migração inicial, Docker Compose, validação de env, health route, prisma.config.ts
- **Out of scope:** rotas de negócio, autenticação, sessões, testes automatizados

## App Structure

```
apps/api/
├── prisma/
│   ├── migrations/
│   │   └── 20260528151025_init/migration.sql
│   ├── migration_lock.toml
│   └── schema.prisma
├── src/
│   ├── lib/
│   │   └── prisma.ts       # singleton PrismaClient com PrismaPg adapter
│   ├── env.ts              # validação Zod das env vars
│   └── server.ts           # app Fastify + ZodTypeProvider + health route
├── .env.example
├── package.json
├── prisma.config.ts        # Prisma 7 config + carregamento manual do .env
└── tsconfig.json

docker-compose.yml          # raiz do monorepo — Postgres 16
```

## Domain Schema

> **Evergreen reference:** este spec é um snapshot do design em 2026-05-28. O modelo de domínio
> autoritativo (com ERD atualizado) vive em
> [docs/architecture/domain-model.md](../architecture/domain-model.md).

### Enums

| Enum | Values |
|------|--------|
| `TokenType` | `PASSWORD_RECOVER` |
| `AccountProvider` | `GITHUB` |
| `Role` | `ADMIN`, `MEMBER`, `BILLING` |

### Models

| Model | Descrição | Campos notáveis |
|-------|-----------|-----------------|
| `User` | Usuário da plataforma | `email` unique, `passwordHash?`, `avatarUrl?` |
| `Token` | Token de recuperação de senha | `type: TokenType`; cascade delete do User |
| `Account` | Conta OAuth vinculada | `[provider, userId]` unique; cascade delete do User |
| `Invite` | Convite para organização | `[email, organizationId]` unique; `authorId` nullable (SetNull); cascade delete da Org |
| `Member` | Participação em organização | `[organizationId, userId]` unique; `role` default `MEMBER`; cascade delete de ambas FK |
| `Organization` | Organização/tenant | `slug` e `domain` únicos; `shouldAttachUsersByDomain`; owner → User (RESTRICT) |
| `Project` | Projeto dentro de organização | `slug` único; cascade delete da Org; owner → User (RESTRICT) |

### Delete behavior

| FK | On Delete |
|----|-----------|
| Token → User | CASCADE |
| Account → User | CASCADE |
| Invite → Author (User) | SET NULL |
| Invite → Organization | CASCADE |
| Member → Organization | CASCADE |
| Member → User | CASCADE |
| Project → Organization | CASCADE |
| Organization → Owner (User) | RESTRICT |
| Project → Owner (User) | RESTRICT |

## Key Files

### `src/env.ts`

```ts
const envSchema = z.object({
  DATABASE_URL: z.url(),
  PORT: z.coerce.number().default(3333),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
})

export const env = envSchema.parse(process.env)
```

Fail-fast no startup: qualquer variável ausente ou inválida lança erro antes do servidor subir.

### `src/lib/prisma.ts`

```ts
export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter: new PrismaPg({ connectionString: env.DATABASE_URL }),
    log: env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  })
```

Singleton para evitar múltiplas conexões em hot-reload de dev.

### `src/server.ts`

```ts
const app = fastify({ logger: true }).withTypeProvider<ZodTypeProvider>()

app.setValidatorCompiler(validatorCompiler)
app.setSerializerCompiler(serializerCompiler)

await app.register(fastifyCors, { origin: true })

app.route({
  method: 'GET',
  url: '/health',
  schema: {
    response: { 200: z.object({ status: z.literal('ok'), db: z.literal('ok') }) },
  },
  handler: async () => {
    await prisma.$queryRaw`SELECT 1`
    return { status: 'ok' as const, db: 'ok' as const }
  },
})
```

Health route faz `SELECT 1` real no banco — não é apenas liveness, é readiness.

### `prisma.config.ts`

Prisma 7 não carrega `.env` automaticamente quando há `prisma.config.ts`. O arquivo lê e injeta o
`.env` manualmente antes de exportar o `defineConfig`, para que `prisma migrate` e `prisma generate`
encontrem `DATABASE_URL`.

## Scripts

```json
"dev":          "tsx watch --env-file .env src/server.ts",
"db:generate":  "prisma generate",
"db:migrate":   "prisma migrate dev",
"db:studio":    "prisma studio"
```

## turbo.json

```json
"dev":        { "env": ["DATABASE_URL", "PORT", "NODE_ENV"] },
"db:generate": { "cache": false },
"db:migrate":  { "cache": false, "env": ["DATABASE_URL"] }
```

## Design Decisions

| Decision | Choice | Reason |
|---|---|---|
| HTTP framework | Fastify 5 | Performance, plugin ecosystem, native TypeScript support |
| Type provider | `fastify-type-provider-zod` | Inferência automática de tipos em routes via Zod schemas |
| DB driver | `@prisma/adapter-pg` (Prisma Driver Adapters) | Sem binário nativo do Prisma query engine; usa `pg` puro |
| Prisma version | 7.x | Versão major atual; config file obrigatório para Driver Adapters |
| `.env` loading | Manual em `prisma.config.ts` | Prisma 7 para de auto-carregar dotenv quando config file presente |
| Env validation | Zod no startup | Fail-fast antes do servidor subir; tipos inferidos ao longo da app |
| Health route | `SELECT 1` real | Verifica conectividade DB, não só que o processo está vivo |
| PrismaClient | Singleton via `globalThis` | Evita múltiplas instâncias e conexões em hot-reload |
| Porta DB local | `5433` (não 5432) | Evita conflito com Postgres instalado localmente na máquina |
