# Handoff — feat/api-auth-routes (Issue #11)

**Branch:** `feat/api-auth-routes`
**Data:** 2026-05-30
**Issue:** https://github.com/pedrosouza423/next-saas-rbac/issues/11

---

## O que já foi feito

### Task 1 ✅ — Branch + ConflictError + error-handler 409
**Commit:** `756bb34`

- Branch `feat/api-auth-routes` criada a partir de `main`
- Criado `apps/api/src/http/errors/conflict-error.ts` — novo erro HTTP 409
- Atualizado `apps/api/src/http/error-handler.ts` — branch `instanceof ConflictError → 409`
- Atualizado `apps/api/test/error-handler.test.ts` — caso de teste 409 adicionado
- 11 testes passando

### Task 2 ✅ — POST /users (criar conta)
**Commit:** `736e80b`

- Criado `apps/api/src/http/routes/auth/create-account.ts`
- Criado `apps/api/test/routes/auth/create-account.test.ts`
- 3 casos de teste: happy path (201 + userId), email duplicado (409), auto-attach por domínio (cria Member)
- TDD completo (stub → red → green → commit)

---

## O que falta implementar

### Task 3 ⏳ — POST /sessions/password (login)
Criar:
- `apps/api/src/http/routes/auth/authenticate-with-password.ts`
- `apps/api/test/routes/auth/authenticate-with-password.test.ts`

4 testes: 200 + token, e-mail não existe (400), senha errada (400), conta OAuth-only sem senha (400).

### Task 4 ⏳ — GET /profile (autenticado)
Criar:
- `apps/api/src/http/routes/auth/get-profile.ts`
- `apps/api/test/routes/auth/get-profile.test.ts`

2 testes: perfil retornado (200), sem token (401).

### Task 5 ⏳ — POST /password/recover
Criar:
- `apps/api/src/http/routes/auth/request-password-recover.ts`
- `apps/api/test/routes/auth/request-password-recover.test.ts`

2 testes: user existe (201 + cria token), user não existe (201 sem criar token — não vaza existência).

### Task 6 ⏳ — POST /password/reset
Criar:
- `apps/api/src/http/routes/auth/reset-password.ts`
- `apps/api/test/routes/auth/reset-password.test.ts`

3 testes: 204 happy path, token inexistente (400), token expirado >1h (400).

### Task 7 ⏳ — Wire routes + server.ts + verificação final
Criar:
- `apps/api/src/http/routes/auth/index.ts` — plugin que registra as 5 rotas

Modificar:
- `apps/api/src/server.ts` — adicionar `await app.register(authRoutes)`

Executar lint, type check, todos os testes, commit final.

---

## Onde está o plano completo

O plano detalhado com todo o código de cada task está em:
**`docs/plans/2026-05-29-api-auth-routes.md`**

Cada task tem: arquivo de teste completo, stub, implementação completa, comandos de run e commit.

---

## Instrução para o próximo chat

Cole o texto abaixo no início do próximo chat:

---

**CONTEXTO PARA CONTINUAR:**

Estou no projeto `c:\Users\Pedro\Documents\Github\next-saas-rbac` (pnpm + Turborepo monorepo).

Branch atual: `feat/api-auth-routes` (já criada, não criar de novo).

**Já implementado (não refazer):**
- Task 1 (commit `756bb34`): `ConflictError` + branch 409 no error handler
- Task 2 (commit `736e80b`): `POST /users` com auto-attach por domínio

**Preciso que você continue implementando as Tasks 3 a 7 do plano em `docs/plans/2026-05-29-api-auth-routes.md`.**

O plano tem o código completo de cada task. Use o skill `superpowers:subagent-driven-development` para executar (é o método que estava sendo usado). Comece pela **Task 3: POST /sessions/password**.

Contexto técnico:
- Fastify 5, Prisma 7, Zod v4 (`import { z } from 'zod/v4'`), Vitest 4
- `fastify-plugin` instalado, todos os imports usam `.js` (ESM)
- `esModuleInterop: true`, `noUncheckedIndexedAccess: true`
- Helper de teste: `apps/api/test/create-test-app.ts` (createTestApp)
- Erros disponíveis: `BadRequestError`, `UnauthorizedError`, `NotFoundError`, `ConflictError`
- `@fastify/jwt` registrado via plugin `auth` em `src/http/middlewares/auth.ts`
- `getCurrentUserId()` disponível via decorator do request (usado no GET /profile)
- `bcryptjs` já instalado

Ao terminar todas as tasks, abra o PR para a `main` com título `feat(api): autenticação por e-mail/senha (signup, login, profile, recovery)`, fechando a Issue #11.
