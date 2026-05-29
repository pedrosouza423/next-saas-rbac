# Design: `feat/api-auth-routes` — Autenticação por e-mail/senha

**Date:** 2026-05-29
**Status:** Aprovado — pronto para implementação
**Issue:** [#11](https://github.com/pedrosouza423/next-saas-rbac/issues/11)
**Branch sugerido:** `feat/api-auth-routes`
**Depende de:** PR #20 (bootstrap: error handler, Swagger, JWT middleware, Vitest) — merged em main

## Resumo

Implementa as rotas de autenticação por e-mail/senha da API Fastify: cadastro, login, perfil autenticado e fluxo de recuperação de senha. Inclui auto-attach por domínio na criação de conta e testes unitários com Prisma mockado.

## Escopo

- **In scope:** `POST /users`, `POST /sessions/password`, `GET /profile`, `POST /password/recover`, `POST /password/reset`, `ConflictError`, testes Vitest com mock
- **Out of scope:** OAuth GitHub (Issue #12), envio real de e-mail (Issue #21), rate limiting

## Estrutura de arquivos

```
apps/api/
├── src/
│   └── http/
│       ├── errors/
│       │   └── conflict-error.ts                  # novo — HTTP 409
│       └── routes/
│           └── auth/
│               ├── index.ts                       # grupo: registra todas as rotas auth
│               ├── create-account.ts              # POST /users
│               ├── authenticate-with-password.ts  # POST /sessions/password
│               ├── get-profile.ts                 # GET /profile
│               ├── request-password-recover.ts    # POST /password/recover
│               └── reset-password.ts              # POST /password/reset
└── test/
    └── routes/
        └── auth/
            ├── create-account.test.ts
            ├── authenticate-with-password.test.ts
            ├── get-profile.test.ts
            ├── request-password-recover.test.ts
            └── reset-password.test.ts
```

### Registro em `server.ts`

```ts
import { authRoutes } from './http/routes/auth/index.js'
// ...
await app.register(authRoutes)
```

### `routes/auth/index.ts`

```ts
import fp from 'fastify-plugin'
import { createAccount } from './create-account.js'
import { authenticateWithPassword } from './authenticate-with-password.js'
import { getProfile } from './get-profile.js'
import { requestPasswordRecover } from './request-password-recover.js'
import { resetPassword } from './reset-password.js'

export const authRoutes = fp(async (app) => {
  app.register(createAccount)
  app.register(authenticateWithPassword)
  app.register(getProfile)
  app.register(requestPasswordRecover)
  app.register(resetPassword)
})
```

## Rotas

### `POST /users` — criar conta

**Schema Zod:**
```ts
body: z.object({ name: z.string(), email: z.email(), password: z.string().min(6) })
response: { 201: z.object({ userId: z.string().uuid() }) }
```

**Handler:**
1. Busca user por `email` — se existe → `ConflictError('User with same email already exists.')`
2. `bcrypt.hash(password, 6)` → `prisma.user.create(...)`
3. Auto-attach: `prisma.organization.findFirst({ where: { shouldAttachUsersByDomain: true, domain: emailDomain } })`
   - Se encontrar → `prisma.member.create({ userId, organizationId, role: 'MEMBER' })` na mesma transação
4. Retorna 201 `{ userId: user.id }`

**emailDomain:** extrai o sufixo após `@` do e-mail (ex: `pedro@acme.com` → `acme.com`).

### `POST /sessions/password` — login

**Schema Zod:**
```ts
body: z.object({ email: z.email(), password: z.string() })
response: { 200: z.object({ token: z.string() }) }
```

**Handler:**
1. `prisma.user.findUnique({ where: { email } })` — não encontrado → `BadRequestError('Invalid credentials.')`
2. `user.passwordHash` nulo (conta OAuth-only) → `BadRequestError('Invalid credentials.')`
3. `bcrypt.compare(password, user.passwordHash)` falso → `BadRequestError('Invalid credentials.')`
4. `app.jwt.sign({ sub: user.id }, { expiresIn: '7d' })` → retorna `{ token }`

A mesma mensagem em todos os casos evita vazar qual campo falhou.

### `GET /profile` — autenticado

**Schema Zod:**
```ts
response: { 200: z.object({ id: z.uuid(), name: z.string().nullable(), email: z.email(), avatarUrl: z.string().url().nullable() }) }
```

**Handler:**
1. `const userId = await request.getCurrentUserId()` (lança 401 se token inválido)
2. `prisma.user.findUnique({ where: { id: userId } })` — não encontrado → `BadRequestError('User not found.')`
3. Retorna `{ id, name, email, avatarUrl }`

### `POST /password/recover`

**Schema Zod:**
```ts
body: z.object({ email: z.email() })
response: { 201: z.object({}) }
```

**Handler:**
1. Busca user por email
2. Se não existir → retorna 201 diretamente (não vaza existência)
3. Se existir → `prisma.token.create({ data: { type: 'PASSWORD_RECOVER', userId: user.id } })`
4. `console.log('Password recover token:', token.id)` (placeholder para Issue #21)
5. Retorna 201 `{}`

### `POST /password/reset`

**Schema Zod:**
```ts
body: z.object({ code: z.string().uuid(), password: z.string().min(6) })
response: { 204: z.object({}) }
```

**Handler:**
1. `prisma.token.findUnique({ where: { id: code }, include: { user: true } })`
2. Token não encontrado → `BadRequestError('Invalid token.')`
3. `token.createdAt < now - 1h` → `BadRequestError('Token expired.')`
4. `prisma.$transaction([ user.update(passwordHash), token.delete ])`
5. Retorna 204

## Error handling

| Erro | HTTP | Classe |
|---|---|---|
| E-mail duplicado | 409 | `ConflictError` (nova) |
| Credenciais inválidas | 400 | `BadRequestError` (existente) |
| Token inválido/expirado | 400 | `BadRequestError` (existente) |
| Não autenticado | 401 | `UnauthorizedError` (existente) via `getCurrentUserId` |

### `conflict-error.ts`

```ts
export class ConflictError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ConflictError'
    Object.setPrototypeOf(this, new.target.prototype)
  }
}
```

O `error-handler.ts` ganha um branch: `if (error instanceof ConflictError) return reply.status(409).send({ message: error.message })`.

## Testes

Padrão: `vi.mock('../../../src/lib/prisma.js')` + `createTestApp()` + `app.inject()`. Sem DB real.

| Arquivo de teste | Casos cobertos |
|---|---|
| `create-account.test.ts` | 201 happy path, 409 e-mail duplicado, auto-attach cria Member |
| `authenticate-with-password.test.ts` | 200 + token, 400 e-mail não existe, 400 senha errada, 400 conta OAuth-only |
| `get-profile.test.ts` | 200 com dados, 401 sem token, 401 token inválido |
| `request-password-recover.test.ts` | 201 user existe (token criado), 201 user não existe (sem criar token) |
| `reset-password.test.ts` | 204 happy path, 400 code inexistente, 400 token expirado |

## Decisões de design

| Decisão | Escolha | Motivo |
|---|---|---|
| Organização de rotas | Grupo `routes/auth/index.ts` | `server.ts` permanece limpo; escala para issues #12–#17 |
| Hash de senha | `bcryptjs`, rounds 6 | Já instalado; rounds 6 rápido o suficiente para dev/testes |
| JWT expiry | `7d` | Padrão SaaS; sem refresh token nesta fase |
| E-mail duplicado | `ConflictError` 409 | Semântica REST correta; distingue de bad request |
| Credenciais inválidas | Mensagem única 400 | Não vaza qual campo falhou |
| Recovery token | `Token.id` (UUID) como code | Já gerado pelo Prisma; sem campo extra |
| Envio de e-mail | `console.log` em dev | Implementação real rastreada em Issue #21 |
| Auto-attach | Inline no handler `POST /users` | Só uma rota usa; extrair seria premature abstraction |
| Testes | Prisma mockado | Consistente com PR #20; rápido, sem DB em CI |

## Docs relacionados

- [domain-model.md](../architecture/domain-model.md) — modelos User, Token, Member
- [rbac-permissions.md](../architecture/rbac-permissions.md) — roles usadas no auto-attach
- [2026-05-28-api-fastify-prisma-setup.md](2026-05-28-api-fastify-prisma-setup.md) — setup base da API
- Issue [#21](https://github.com/pedrosouza423/next-saas-rbac/issues/21) — envio real de e-mail (recovery)
- Issue [#12](https://github.com/pedrosouza423/next-saas-rbac/issues/12) — OAuth GitHub
