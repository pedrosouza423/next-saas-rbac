# Design: `feat/api-members` — Gestão de Membros de Organização

**Date:** 2026-06-02
**Status:** Implementado
**Issue:** [#15](https://github.com/pedrosouza423/next-saas-rbac/issues/15)
**Branch:** `feat/api-members`
**Depende de:** PR #13 (Organizations) — merged em main

## Resumo

Implementa a gestão de membros escopada por organização: listar membros, atualizar role e
remover um membro. A autorização usa CASL ABAC — update é ADMIN-only; delete permite
ADMIN remover qualquer um ou MEMBER fazer self-remove.

## Escopo

**In scope:**
- `GET /organizations/:slug/members` — listar membros com dados do usuário (todos os roles)
- `PUT /organizations/:slug/members/:memberId` — atualizar role de membro (ADMIN-only)
- `DELETE /organizations/:slug/members/:memberId` — remover membro (ADMIN ou self-remove por MEMBER)

**Out of scope:** paginação, busca/filtro de membros

## Decisões tomadas

### 1. Self-remove via CASL (não check manual)

A permissão de MEMBER fazer self-remove é expressa diretamente em `permissions.ts`:
```ts
can('delete', 'User', { id: { $eq: user.id } })
```
Assim, toda a lógica de autorização fica centralizada em `@saas/auth`, consistente com o
padrão de `can(['update', 'delete'], 'Project', { ownerId: { $eq: user.id } })` para projetos.

### 2. `userCan` wrapper em `assert-can.ts`

Adicionado `userCan(ability, 'delete', subject: User)` seguindo o mesmo padrão de `projectCan`
e `organizationCan`. O wrapper força o caller a passar uma instância (objeto com `__typename`),
prevenindo o bypass silencioso onde `ability.can('delete', 'User')` (string) retornaria `true`
para MEMBER (pois CASL ignora conditions em string subjects).

### 3. GET sem check ABAC explícito

Igual ao padrão de `get-projects.ts` e org routes — ser membro da org é suficiente para listar
membros. BILLING acessa via membership implícito, consistente com o comportamento já estabelecido.

### 4. `:memberId` = `Member.id` (não `User.id`)

O parâmetro de rota usa o ID do registro `Member`, que é retornado no `id` da listagem.
Isso evita ambiguidade e é consistente com `:projectId` = `Project.id` nos project routes.

### 5. Guard de owner antes do ABAC no DELETE

A guarda "não pode remover o owner" é verificada antes do check ABAC — garante que qualquer
tentativa de remover o owner retorna 400 (negócio) antes de checar permissão. Para update-role,
o check ABAC (ADMIN-only) vem primeiro para fail-fast antes da query do target.

## Estrutura de arquivos

```
apps/api/
├── src/
│   ├── http/
│   │   └── routes/
│   │       └── members/
│   │           ├── index.ts                    (barrel)
│   │           ├── get-members.ts              (GET /organizations/:slug/members)
│   │           ├── update-member-role.ts       (PUT /organizations/:slug/members/:memberId)
│   │           └── delete-member.ts            (DELETE /organizations/:slug/members/:memberId)
│   └── server.ts                               (+ app.register(memberRoutes))
packages/auth/src/
├── permissions.ts                              (+ can('delete', 'User', ...) para MEMBER)
└── assert-can.ts                               (+ userCan wrapper)
```

## Matriz de autorização

| Rota | ADMIN | MEMBER (self) | MEMBER (outro) | BILLING |
|------|:-----:|:-------------:|:--------------:|:-------:|
| GET …/members | ✅ | ✅ | ✅ | ✅ |
| PUT …/members/:id | ✅ | ✅* | ✅* | ❌ 403 |
| DELETE …/members/:id | ✅ | ✅ (self) | ❌ 403 | ❌ 403 |

*ADMIN pode atualizar qualquer role; não pode alterar o role do owner (400).
Owner não pode ser removido por ninguém (400).

## Key Files

| Action | File | Purpose |
|--------|------|---------|
| Create | `apps/api/src/http/routes/members/get-members.ts` | GET — lista membros com dados do usuário |
| Create | `apps/api/src/http/routes/members/update-member-role.ts` | PUT — atualiza role (ADMIN-only) |
| Create | `apps/api/src/http/routes/members/delete-member.ts` | DELETE — remove membro (ADMIN ou self) |
| Create | `apps/api/src/http/routes/members/index.ts` | barrel que registra as três rotas |
| Modify | `apps/api/src/server.ts` | registra `memberRoutes` |
| Modify | `packages/auth/src/permissions.ts` | adiciona self-delete para MEMBER |
| Modify | `packages/auth/src/assert-can.ts` | adiciona `userCan` wrapper |

## Verification

```bash
# Listar membros
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3333/organizations/my-org/members

# ADMIN atualiza role
curl -X PUT -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"role":"BILLING"}' \
  http://localhost:3333/organizations/my-org/members/$MEMBER_ID

# MEMBER self-remove
curl -X DELETE -H "Authorization: Bearer $MEMBER_TOKEN" \
  http://localhost:3333/organizations/my-org/members/$MY_MEMBER_ID

# Tentativa de remover owner → 400
curl -X DELETE -H "Authorization: Bearer $ADMIN_TOKEN" \
  http://localhost:3333/organizations/my-org/members/$OWNER_MEMBER_ID

# BILLING tenta atualizar role → 403
curl -X PUT -H "Authorization: Bearer $BILLING_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"role":"MEMBER"}' \
  http://localhost:3333/organizations/my-org/members/$MEMBER_ID
```

## Related

- Architecture: [docs/architecture/rbac-permissions.md](../architecture/rbac-permissions.md)
- Architecture: [docs/architecture/api-routes.md](../architecture/api-routes.md)
- Previous spec: [docs/specs/2026-06-01-api-projects.md](2026-06-01-api-projects.md)
