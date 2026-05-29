# Design: API Bootstrap — Infrastructure Setup

**Date:** 2026-05-29
**Status:** Implemented — `feat/api-bootstrap`, PR [#10](https://github.com/pedrosouza423/next-saas-rbac/pull/10)

## Summary

Infraestrutura essencial do `apps/api` para suportar autenticação, rotas de negócio e testes:
tratamento de erros customizado com error handler global, validação de variáveis de ambiente
expandida (JWT_SECRET obrigatória, OAuth vars opcionais), geração automática de documentação
(Swagger + SwaggerUI), middleware de autenticação JWT com decorators `getCurrentUserId()` e
`getUserMembership()`, seed idempotente do banco, e testes unitários via Vitest.

## Scope

- **In scope:** error handling (BadRequestError, UnauthorizedError, NotFoundError), global error handler,
  env vars (JWT_SECRET obrigatória, GitHub OAuth opcionais), Swagger + SwaggerUI, JWT middleware com
  request decorators, seed idempotente, Vitest setup com 10 testes
- **Out of scope:** rotas de negócio (login, organizações, projetos), implementação de refresh tokens,
  OAuth integration (será PR #3)

## Design

### Error handling

**Arquivo:** `src/http/errors/` e `src/http/error-handler.ts`

Três classes customizadas que estendem `Error`:

```ts
export class BadRequestError extends Error {
  constructor(message: string) {
    super(message)
    Object.setPrototypeOf(this, new.target.prototype)
  }
  readonly statusCode = 400
}

export class UnauthorizedError extends Error {
  constructor(message: string) {
    super(message)
    Object.setPrototypeOf(this, new.target.prototype)
  }
  readonly statusCode = 401
}

export class NotFoundError extends Error {
  constructor(message: string) {
    super(message)
    Object.setPrototypeOf(this, new.target.prototype)
  }
  readonly statusCode = 404
}
```

**Por que `Object.setPrototypeOf`?** Vide [ADR-0001](../adr/0001-error-class-prototype-fix.md).

**Global error handler** registrado em `src/http/error-handler.ts`:

```ts
app.setErrorHandler((error, request, reply) => {
  if (error instanceof ZodError) {
    return reply.status(400).send({
      code: 'VALIDATION_ERROR',
      message: error.errors[0].message,
      issues: error.errors,
    })
  }

  if (error instanceof BadRequestError) {
    return reply.status(400).send({ code: 'BAD_REQUEST', message: error.message })
  }

  if (error instanceof UnauthorizedError) {
    return reply.status(401).send({ code: 'UNAUTHORIZED', message: error.message })
  }

  if (error instanceof NotFoundError) {
    return reply.status(404).send({ code: 'NOT_FOUND', message: error.message })
  }

  // fallback para erros não-tratados
  reply.status(500).send({ code: 'INTERNAL_ERROR', message: 'Internal server error' })
})
```

Erros não-identificados → 500. Erros de validação Zod → 400 com detalhe de `issues`. Erros
customizados → HTTP status correto.

### Environment validation

**Arquivo:** `src/env.ts`

```ts
const envSchema = z.object({
  DATABASE_URL: z.url(),
  PORT: z.coerce.number().default(3333),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  JWT_SECRET: z.string().min(1),
  GITHUB_OAUTH_CLIENT_ID: z.string().optional(),
  GITHUB_OAUTH_CLIENT_SECRET: z.string().optional(),
  GITHUB_OAUTH_CLIENT_REDIRECT_URI: z.string().optional(),
})

export const env = envSchema.parse(process.env)
```

- **Obrigatórias:** `DATABASE_URL`, `PORT`, `NODE_ENV`, `JWT_SECRET`
- **Opcionais:** `GITHUB_OAUTH_CLIENT_ID`, `GITHUB_OAUTH_CLIENT_SECRET`,
  `GITHUB_OAUTH_CLIENT_REDIRECT_URI`

Vide [ADR-0002](../adr/0002-github-oauth-env-optional.md) para justificativa de OAuth vars serem
opcionais.

### Swagger + SwaggerUI

**Arquivo:** `src/server.ts` (no setup de plugins)

```ts
await app.register(fastifySwagger, {
  swagger: {
    info: {
      title: 'next-saas-rbac API',
      version: '1.0.0',
    },
  },
  transform: jsonSchemaTransform,
})

await app.register(fastifySwaggerUi, {
  routePrefix: '/docs',
})
```

- `@fastify/swagger` + `@fastify/swagger-ui` registradas como plugins
- `jsonSchemaTransform` vem de `fastify-type-provider-zod` — permite que Zod schemas sejam
  convertidos para OpenAPI automaticamente
- Disponível em `http://localhost:3333/docs` quando `pnpm --filter=api dev`

### JWT middleware

**Arquivo:** `src/http/middlewares/auth.ts`

Registrado como Fastify plugin (sem encapsulation boundary):

```ts
export default fastifyPlugin(async (app) => {
  app.decorate('getCurrentUserId', async function() {
    const token = this.headers.authorization?.replace('Bearer ', '')
    if (!token) throw new UnauthorizedError('Missing authorization header')

    try {
      const decoded = jwt.verify(token, env.JWT_SECRET) as JwtPayload
      return decoded.sub
    } catch {
      throw new UnauthorizedError('Invalid token')
    }
  })

  app.decorate('getUserMembership', async function(slug: string) {
    const userId = await this.getCurrentUserId()
    const member = await prisma.member.findFirst({
      where: { organization: { slug }, user: { id: userId } },
      include: { organization: true },
    })
    if (!member) throw new UnauthorizedError('User is not a member of this organization')
    return member
  })
})
```

Rotas autenticadas usam:

```ts
app.get('/organizations/:slug/projects', async (request) => {
  const member = await request.getUserMembership(request.params.slug)
  // ... resto da lógica
})
```

### Database seed

**Arquivo:** `prisma/seed.ts`

Idempotente — usa `upsert`:

```ts
const johnAcme = await prisma.user.upsert({
  where: { email: 'john@acme.com' },
  update: {},
  create: {
    email: 'john@acme.com',
    passwordHash: await hash('123456'),
  },
})

const acme = await prisma.organization.upsert({
  where: { slug: 'acme' },
  update: {},
  create: {
    name: 'Acme Inc',
    slug: 'acme',
    ownerId: johnAcme.id,
  },
})

// ... restante
```

Executa via: `pnpm --filter=api db:seed`

Cria:
- 1 usuário: `john@acme.com` (senha: `123456`)
- 2 organizações: `acme`, `acme-beta`
- 1 projeto: `acme/website`
- 1 convite pendente: para `maria@example.com` na `acme`

### Vitest setup

**Arquivo:** `vitest.config.ts`, `test/unit/`

```ts
export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
  },
})
```

10 testes unitários:
- Error handler: 5 testes (BadRequest, Unauthorized, NotFound, ZodError, unknown error)
- JWT middleware: 5 testes (getCurrentUserId success, invalid token, missing header, getUserMembership
  success, not a member)

Nenhum teste precisa de banco de dados real — Prisma é mocado via `vi.mock()`.

Executa via: `pnpm --filter=api test`

## Key Files

| Action | File | Purpose |
|--------|------|---------|
| Create | `src/http/errors/bad-request.ts` | BadRequestError — 400 |
| Create | `src/http/errors/unauthorized.ts` | UnauthorizedError — 401 |
| Create | `src/http/errors/not-found.ts` | NotFoundError — 404 |
| Create | `src/http/error-handler.ts` | Global error handler via `setErrorHandler` |
| Create | `src/http/middlewares/auth.ts` | JWT middleware com `getCurrentUserId()` e `getUserMembership()` |
| Create | `src/env.ts` (expand) | JWT_SECRET obrigatória; GitHub OAuth vars opcionais |
| Create | `prisma/seed.ts` | Seed idempotente (1 user, 2 orgs, 1 project, 1 invite) |
| Create | `vitest.config.ts` | Config do Vitest |
| Create | `test/unit/error-handler.test.ts` | 5 testes do error handler |
| Create | `test/unit/auth-middleware.test.ts` | 5 testes do JWT middleware |
| Modify | `src/server.ts` | Registrar plugins (Swagger, error handler, auth middleware) |
| Modify | `package.json` | Deps: `@fastify/swagger`, `@fastify/swagger-ui`, `@fastify/jwt`, `vitest` |

## Design Decisions

| Decision | Choice | Reason |
|---|---|---|
| Error classes | Custom + `Object.setPrototypeOf` | Garante `instanceof` funciona após compilação TS/esbuild |
| JWT middleware | Fastify plugin sem encapsulation | Acessível globalmente em qualquer rota |
| OAuth env vars | Opcionais (.optional()) | Startup não falha antes de PR #3 implementar OAuth |
| Seed idempotência | `upsert` | Re-run safe — dev recomeça sem limpar banco manualmente |
| Swagger | Via `@fastify/swagger` + `@fastify/swagger-ui` | Auto-docs de rotas Zod; OpenAPI compliant |

## Verification

```bash
# Testes de erro
pnpm --filter=api test
# Deve passar 10/10

# Type check
pnpm --filter=api check-types
# Sem erros

# Lint
pnpm --filter=api lint
# Max warnings: 0

# Documentação
pnpm --filter=api dev
# Acessa http://localhost:3333/docs — Swagger UI com rotas listadas
```

## Related

- ADR: [docs/adr/0001-error-class-prototype-fix.md](../adr/0001-error-class-prototype-fix.md)
- ADR: [docs/adr/0002-github-oauth-env-optional.md](../adr/0002-github-oauth-env-optional.md)
- Spec anterior: [docs/specs/2026-05-28-api-fastify-prisma-setup.md](2026-05-28-api-fastify-prisma-setup.md)
