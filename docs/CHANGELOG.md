# Changelog

## [Unreleased] — branch `feat/fastify-api-prisma-setup` (PR [#8](https://github.com/pedrosouza423/next-saas-rbac/pull/8))

### Added

- `docker-compose.yml` — Postgres 16 service (`next-saas-pg`), porta `5433:5432`, credenciais `docker:docker`, db `next-saas`, volume persistente `next_saas_pg_data`
- `apps/api` — novo app Fastify 5 com:
  - Fastify 5 + `fastify-type-provider-zod` (validação e serialização via Zod v4)
  - `@fastify/cors` habilitado (`origin: true`)
  - Prisma 7 + `@prisma/adapter-pg` (driver pg nativo, sem binário de query engine)
  - `src/env.ts` — validação de env com Zod: `DATABASE_URL`, `PORT` (default 3333), `NODE_ENV`
  - `src/lib/prisma.ts` — singleton `PrismaClient` com `PrismaPg` adapter e logs de dev
  - `src/server.ts` — app com `ZodTypeProvider`, CORS e rota `GET /health` (pinga o banco com `SELECT 1`)
  - `prisma/schema.prisma` — schema completo do domínio (ver abaixo)
  - `prisma.config.ts` — config Prisma 7; carrega `.env` manualmente porque Prisma 7 não auto-carrega dotenv quando há config file
  - `apps/api/.env.example` com `DATABASE_URL` e `PORT`
  - Scripts: `dev`, `db:generate`, `db:migrate`, `db:studio`
- Schema Prisma com todos os modelos de domínio:
  - **Enums:** `TokenType` (`PASSWORD_RECOVER`), `AccountProvider` (`GITHUB`), `Role` (`ADMIN`, `MEMBER`, `BILLING`)
  - **User** — `id`, `name?`, `email` (unique), `passwordHash?`, `avatarUrl?`, timestamps
  - **Token** — pertence a User (cascade delete), `type: TokenType`
  - **Account** — OAuth account, `provider + userId` unique, pertence a User (cascade delete)
  - **Invite** — `email + organizationId` unique, `authorId` nullable (SetNull), pertence a Organization (cascade delete)
  - **Member** — `organizationId + userId` unique, `role` default `MEMBER`, cascade delete em ambas as FK
  - **Organization** — `slug` e `domain` únicos, `shouldAttachUsersByDomain`, owner → User (RESTRICT)
  - **Project** — `slug` único, pertence a Organization (cascade delete), owner → User (RESTRICT)
- Migration `20260528151025_init` — cria todas as tabelas, enums, índices e FK
- `turbo.json` — adicionadas tasks `db:generate` e `db:migrate`; `dev` declara `DATABASE_URL`, `PORT`, `NODE_ENV` em `env`

---

## [Unreleased] — branch `setup/initial-setup` (PR [#2](https://github.com/pedrosouza423/next-saas-rbac/pull/2))

### Added

- Monorepo base com pnpm + Turborepo: `package.json`, `turbo.json`, `pnpm-workspace.yaml`, `.npmrc`, `.gitignore`
- Pacote `@saas/eslint-config` (`packages/eslint-config/`) com três perfis:
  - `base` — regras compartilhadas por todos os pacotes (`eslint-plugin-turbo`, `eslint-plugin-only-warn`)
  - `next-js` — para apps Next.js (React, React Hooks, `@next/eslint-plugin-next`)
  - `react-internal` — para bibliotecas React internas
- Pacote `@saas/typescript-config` (`packages/typescript-config/`) com bases para Next.js e React library
- Pacote `@saas/ui` (`packages/ui/`) — biblioteca de componentes React compartilhada, exporta direto do source via `"exports": { "./*": "./src/*.tsx" }` sem build step
- Apps `web` (porta 3000) e `docs` (porta 3001) com Next.js 16 + React 19, páginas limpas sem boilerplate
- `CLAUDE.md` com documentação de comandos e arquitetura para o Claude Code

### Changed

- Escopo dos pacotes internos renomeado de `@repo/*` (padrão do template Turborepo) para `@saas/*`
- `README.md` substituído pelo template padrão do Turborepo (será atualizado com conteúdo específico do projeto)

### Fixed

- `packages/eslint-config/next.js`: adicionado `globals.browser` em `languageOptions` — sem isso, `window`, `document` e `navigator` causariam erros de `no-undef` nos apps Next.js ([commit 53243a8](https://github.com/pedrosouza423/next-saas-rbac/commit/53243a8))
- `packages/eslint-config/next.js` e `react-internal.js`: removida duplicação de `js.configs.recommended`, `eslintConfigPrettier` e `tseslint.configs.recommended` que já estavam inclusos via `...baseConfig` ([commit 53243a8](https://github.com/pedrosouza423/next-saas-rbac/commit/53243a8))

### Removed

- Boilerplate do template Turborepo: telas de boas-vindas, links UTM, prop `appName` no `Button`, links com tracking no `Card`
- Imports não utilizados em `next.js` e `react-internal.js` após remoção das camadas duplicadas
