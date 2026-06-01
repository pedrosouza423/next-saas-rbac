# Design: `feat/api-organizations` — CRUD de Organizações + Ownership Transfer

**Date:** 2026-06-01
**Status:** Implementado
**Issue:** [#13](https://github.com/pedrosouza423/next-saas-rbac/issues/13)
**Branch:** `feat/api-organizations`
**Depende de:** PR #22 (auth routes — GitHub OAuth) — merged em main

## Resumo

Implementa o CRUD completo de organizações (multi-tenant base) e a transferência de ownership.
Toda org tem um owner (User) e N Members. A autorização usa CASL ABAC via `@saas/auth`.

## Escopo

**In scope:**
- `POST /organizations` — criar org + membro ADMIN para o criador
- `GET /organizations` — listar orgs do usuário com role
- `GET /organizations/:slug` — detalhe da org
- `GET /organizations/:slug/membership` — membership do usuário atual
- `PUT /organizations/:slug` — atualizar org (só owner)
- `DELETE /organizations/:slug` — deletar org (só ADMIN)
- `PATCH /organizations/:slug/owner` — transferir ownership (só owner)
- `ForbiddenError` (HTTP 403) — novo erro para falhas de ABAC
- Testes Vitest cobrindo matriz role × ação por rota

**Out of scope:** avatarUrl upload, convites, listagem de membros

## Decisões tomadas

### 1. ForbiddenError (403) separado de UnauthorizedError (401)

Semântica correta: `401 = não autenticado`, `403 = autenticado mas sem permissão`.
O middleware `getUserMembership` continua retornando 401 para não-membros (information hiding).

### 2. Delete — qualquer ADMIN pode deletar (não apenas owner)

As regras CASL concedem `manage all` para ADMIN sem restrição de ownership em `delete`.
`organizationCan` foi estendido para aceitar `'delete'` para manter consistência com
o padrão defensivo do `assert-can.ts` (proteção contra futuros ownership conditions).

### 3. Slug — gerado a partir do nome, imutável após criação

Gerado via `slugify(name)` no `POST`. O `PUT` não regenera o slug.
Conflito de slug → `ConflictError` 409 (pré-check + safety net no catch P2002).

### 4. Transfer ownership — guarda contra auto-transferência

`transferToUserId === membership.userId` → `BadRequestError` 400.
Usa `prisma.$transaction([...])` (batch) para atualizar `ownerId` + promover novo owner para ADMIN atomicamente.

## Estrutura de arquivos

```
apps/api/
├── src/
│   ├── http/
│   │   ├── errors/
│   │   │   └── forbidden-error.ts              (novo — HTTP 403)
│   │   └── routes/
│   │       └── orgs/
│   │           ├── index.ts                    (barrel)
│   │           ├── create-org.ts               (POST /organizations)
│   │           ├── get-orgs.ts                 (GET /organizations)
│   │           ├── get-org.ts                  (GET /organizations/:slug)
│   │           ├── get-org-membership.ts        (GET /organizations/:slug/membership)
│   │           ├── update-org.ts               (PUT /organizations/:slug)
│   │           ├── delete-org.ts               (DELETE /organizations/:slug)
│   │           └── transfer-org-ownership.ts   (PATCH /organizations/:slug/owner)
│   └── server.ts                               (+ app.register(orgRoutes))
└── test/routes/orgs/
    ├── create-org.test.ts
    ├── get-orgs.test.ts
    ├── get-org.test.ts
    ├── get-org-membership.test.ts
    ├── update-org.test.ts
    ├── delete-org.test.ts
    └── transfer-org-ownership.test.ts

packages/auth/src/
└── assert-can.ts   ('delete' adicionado ao organizationCan)
```

## Matriz de autorização

| Rota | ADMIN (owner) | ADMIN (não-owner) | MEMBER | BILLING |
|------|:---:|:---:|:---:|:---:|
| POST /organizations | ✅ | ✅ | ✅ | ✅ |
| GET /organizations | ✅ | ✅ | ✅ | ✅ |
| GET /organizations/:slug | ✅ | ✅ | ✅ | ✅ |
| GET /organizations/:slug/membership | ✅ | ✅ | ✅ | ✅ |
| PUT /organizations/:slug | ✅ | ❌ 403 | ❌ 403 | ❌ 403 |
| DELETE /organizations/:slug | ✅ | ✅ | ❌ 403 | ❌ 403 |
| PATCH /organizations/:slug/owner | ✅ | ❌ 403 | ❌ 403 | ❌ 403 |

Rotas com `:slug` retornam 401 se o usuário não for membro da org (via `getUserMembership`).

## Padrão ABAC nas rotas

```ts
const { organization, membership } = await request.getUserMembership(slug)
const ability = defineAbilityFor(userSchema.parse({ id: membership.userId, role: membership.role }))
const orgSubject = organizationSchema.parse(organization)

if (!organizationCan(ability, 'update', orgSubject)) {
  throw new ForbiddenError('You are not allowed to update this organization.')
}
```
