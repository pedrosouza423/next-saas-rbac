# API Billing — Design Spec

**Date:** 2026-06-04
**Issue:** #17
**Branch:** `feat/api-billing`
**Status:** Approved
**Depends on:** PR #5 (Projects), PR #6 (Members)

---

## Contexto

Fecha a API com o subsistema de billing e revisão formal das cascade rules do Prisma. O endpoint
expõe um resumo de cobrança por organização (membros × R$10 + projetos × R$20). As cascade rules
são tornadas explícitas no schema para documentar a decisão de design e torná-la rastreável no
histórico de migrations.

---

## 1. Route: `GET /organizations/:slug/billing`

### Autorização

ABAC via CASL: `ability.can('get', 'Billing')`.

| Role    | Resultado |
|---------|-----------|
| ADMIN   | ✅ (`manage all` cobre `Billing`) |
| BILLING | ✅ (`manage Billing` cobre `get`) |
| MEMBER  | ❌ 403 Forbidden |

Sem wrapper `billingCan` — `Billing` é um string subject sem ownership conditions, então
`ability.can('get', 'Billing')` é seguro direto.

### Cálculo

```
amountOfMembers  = COUNT(members WHERE organizationId = :id AND role != 'BILLING')
amountOfProjects = COUNT(projects WHERE organizationId = :id)
pricePerMember   = 10   (constante)
pricePerProject  = 20   (constante)
total            = amountOfMembers × 10 + amountOfProjects × 20
```

Membros com role `BILLING` são excluídos da contagem — são administradores financeiros, não
usuários pagantes do plano.

### Resposta (200)

```json
{
  "billing": {
    "amountOfMembers": 3,
    "amountOfProjects": 2,
    "pricePerMember": 10,
    "pricePerProject": 20,
    "total": 70
  }
}
```

### Arquivos

| Arquivo | Ação |
|---------|------|
| `apps/api/src/http/routes/billing/get-organization-billing.ts` | Criar |
| `apps/api/src/http/routes/billing/index.ts` | Criar (barrel) |
| `apps/api/src/server.ts` | Registrar `billingRoutes` |
| `apps/api/src/lib/constants.ts` | Adicionar `PRICE_PER_MEMBER = 10`, `PRICE_PER_PROJECT = 20` |

---

## 2. Cascade Rules

### Decisão: `Restrict` para relações de ownership

Tanto `Project.ownerId → User` quanto `Organization.ownerId → User` ficam como `onDelete: Restrict`.

**Motivação:** projetos e organizações não devem ficar orphaned. O fluxo correto é transferir ou
deletar os recursos antes de remover o usuário. `SetNull` foi descartado porque exigiria tornar
`ownerId` nullable em ambos os modelos, introduzindo guards em todos os code paths que assumem
owner presente.

### Schema changes

```prisma
// Project.owner
owner   User   @relation(fields: [ownerId], references: [id], onDelete: Restrict)
// onDelete: Restrict — deleting a user who owns projects is blocked; transfer or delete projects first.

// Organization.owner
owner   User   @relation(fields: [ownerId], references: [id], onDelete: Restrict)
// onDelete: Restrict — organization must always have an owner; transfer ownership before deleting the user.

// Invite.author — sem mudança de comportamento, só confirmação
author   User?   @relation(fields: [authorId], references: [id], onDelete: SetNull)
// onDelete: SetNull — invite survives when its author is deleted; authorId becomes null.
```

### Migration

```
pnpm --filter=api db:migrate dev --name explicit-cascade-rules
```

O SQL gerado é idempotente — Postgres já operava com RESTRICT nesses campos (comportamento padrão
de FK sem `ON DELETE`). A migration documenta a decisão no histórico, sem alterar dados.

---

## 3. Docs

| Arquivo | Ação |
|---------|------|
| `docs/architecture/api-routes.md` | Adicionar `GET /organizations/:slug/billing` |
| `docs/architecture/domain-model.md` | Atualizar seção de delete behavior com os `onDelete` explícitos |
| `docs/README.md` | Adicionar este spec na tabela de Specs |

---

## 4. Testes

| Caso | Tipo |
|------|------|
| BILLING role excluído da contagem de `amountOfMembers` | Integração |
| MEMBER recebe 403 ao acessar billing | Integração |
| ADMIN e BILLING recebem 200 com payload correto | Integração |
| Deletar User que possui Project → erro (Restrict) | Integração Prisma |
