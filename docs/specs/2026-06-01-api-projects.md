# Design: `feat/api-projects` — CRUD de Projetos escopado por Organização

**Date:** 2026-06-01
**Status:** Implementado
**Issue:** [#14](https://github.com/pedrosouza423/next-saas-rbac/issues/14)
**Branch:** `feat/api-projects`
**Depende de:** PR #13 (Organizations) — merged em main

## Resumo

Implementa o CRUD de projetos escopados por organização. Todo projeto tem um `ownerId`
(quem criou) e um `organizationId`. A autorização para mutações usa CASL ABAC via
`projectCan` de `@saas/auth`.

## Escopo

**In scope:**
- `POST /organizations/:slug/projects` — criar projeto (MEMBER+; BILLING bloqueado)
- `GET /organizations/:slug/projects` — listar projetos da org com owner básico
- `GET /organizations/:slug/projects/:projectSlug` — detalhe do projeto
- `PUT /organizations/:slug/projects/:projectId` — atualizar (ADMIN ou owner)
- `DELETE /organizations/:slug/projects/:projectId` — deletar (ADMIN ou owner)

**Out of scope:** upload de avatarUrl, paginação

## Decisões tomadas

### 1. Slug de projeto escopado por organização (`@@unique([slug, organizationId])`)

O schema inicial tinha `slug String @unique` (global). Foi alterado para
`@@unique([slug, organizationId])` via migration `20260601000001_fix_project_slug_org_scoped`.
Isso permite que orgs diferentes criem projetos com o mesmo nome.
O `create` e `update` fazem lookup por `{ slug_organizationId: { slug, organizationId } }`.

### 2. `url?` no body → `avatarUrl`

O schema Prisma só tem `avatarUrl` como campo de URL no modelo `Project`.
O campo opcional `url?` da spec foi mapeado para `avatarUrl`.

### 2. GET routes sem check ABAC explícito

Seguindo o padrão dos org routes (`get-org.ts`, `get-orgs.ts`), as rotas de leitura
não fazem check ABAC explícito. Ser membro da org (verificado por `getUserMembership`)
é suficiente para listar/ver projetos. BILLING role não tem permissão `get` no CASL,
mas acessa via membership implícito — consistente com o comportamento das org routes.

### 3. GET usa `:projectSlug`, PUT/DELETE usam `:projectId`

Leitura por slug (URL legível). Mutações por UUID (retornado no `id` do projeto via GET),
evitando ambiguidade caso o slug mude no futuro.

### 5. Slug — gerado a partir do `name`, único por org, regenerado no `PUT`

Mesmo `slugify` inline de `create-org.ts`. Pré-check + safety net no catch P2002.
O `PUT` também regenera o slug quando `name` é fornecido, verificando conflito
dentro da mesma organização (excluindo o slug atual do projeto).

### 6. Scoping por `organizationId` em todas as queries de projeto

`findFirst({ where: { id: projectId, organizationId: organization.id } })` garante
que projetos de outras orgs não sejam acessados mesmo com um `projectId` válido mas
pertencente a outra organização.

## Estrutura de arquivos

```
apps/api/
├── src/
│   ├── http/
│   │   └── routes/
│   │       └── projects/
│   │           ├── index.ts                    (barrel)
│   │           ├── create-project.ts           (POST /organizations/:slug/projects)
│   │           ├── get-projects.ts             (GET /organizations/:slug/projects)
│   │           ├── get-project.ts              (GET /organizations/:slug/projects/:projectSlug)
│   │           ├── update-project.ts           (PUT /organizations/:slug/projects/:projectId)
│   │           └── delete-project.ts           (DELETE /organizations/:slug/projects/:projectId)
│   └── server.ts                               (+ app.register(projectRoutes))
```

## Matriz de autorização

| Rota | ADMIN | MEMBER (owner) | MEMBER (não-owner) | BILLING |
|------|:-----:|:--------------:|:------------------:|:-------:|
| POST …/projects | ✅ | ✅ | ✅ | ❌ 403 |
| GET …/projects | ✅ | ✅ | ✅ | ✅ |
| GET …/projects/:slug | ✅ | ✅ | ✅ | ✅ |
| PUT …/projects/:id | ✅ | ✅ | ❌ 403 | ❌ 403 |
| DELETE …/projects/:id | ✅ | ✅ | ❌ 403 | ❌ 403 |

Rotas escopadas por `:slug` da org retornam 401 se o usuário não for membro
(via `getUserMembership`).

## Padrão ABAC nas rotas de mutação

```ts
const { organization, membership } = await request.getUserMembership(slug)

const project = await prisma.project.findFirst({
  where: { id: projectId, organizationId: organization.id },
})
if (!project) throw new NotFoundError('Project not found.')

const ability = defineAbilityFor(
  userSchema.parse({ id: membership.userId, role: membership.role }),
)
const projectSubject = projectSchema.parse(project)

if (!projectCan(ability, 'update', projectSubject)) {
  throw new ForbiddenError('You are not allowed to update this project.')
}
```
