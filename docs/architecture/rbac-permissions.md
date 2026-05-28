# Architecture — RBAC Permissions

**Last updated:** 2026-05-28
**Authoritative source:** [packages/auth/src/permissions.ts](../../packages/auth/src/permissions.ts) + [packages/auth/src/subjects/](../../packages/auth/src/subjects/)

Este documento descreve **quem pode fazer o quê** no sistema. A autorização é implementada
em [`@saas/auth`](../../packages/auth/) via CASL (`@casl/ability` v6). Quando uma regra
mudar, atualize **aqui** primeiro, depois ajuste `permissions.ts`.

## Modelo CASL — subject × action × role

CASL define **abilities** como tuplas `(action, subject, [conditions])`. Uma ability é
construída por role, e o consumidor pergunta `ability.can('action', subject)` para autorizar.

Aqui temos **5 subjects** e **3 roles**:

| Subject | Representa |
|---------|-----------|
| `User` | Usuário individual ([model](../../apps/api/prisma/schema.prisma)) |
| `Organization` | Tenant — escopo de membership e billing |
| `Project` | Recurso de negócio dentro de uma Org |
| `Invite` | Convite para entrar numa Org |
| `Billing` | Recurso de cobrança da Org |

| Role | Definição operacional |
|------|----------------------|
| `ADMIN` | Acesso total à Organization, exceto operações sensíveis (transferir/atualizar Org) restritas ao **owner** |
| `MEMBER` | Acesso limitado ao próprio User e aos Projects (próprios para mutação) |
| `BILLING` | Restrito a operações de cobrança |

## Full permission matrix

> Notação:
> - ✅ — pode sempre
> - ❌ — não pode
> - 🔒 owner — só se `subject.ownerId === user.id` (condição CASL `$eq`)

| Action | Subject | ADMIN | MEMBER | BILLING |
|---|---|---|---|---|
| `get` | `User` | ✅ (via manage all) | ✅ | ❌ |
| `invite` | `User` | ✅ (via manage all) | ✅ | ❌ |
| `update` | `User` | ✅ (via manage all) | ❌ | ❌ |
| `delete` | `User` | ✅ (via manage all) | ❌ | ❌ |
| `create` | `Organization` | ✅ (via manage all) | ❌ | ❌ |
| `delete` | `Organization` | ✅ (via manage all) | ❌ | ❌ |
| `update` | `Organization` | 🔒 owner | ❌ | ❌ |
| `transfer_ownership` | `Organization` | 🔒 owner | ❌ | ❌ |
| `get` | `Project` | ✅ (via manage all) | ✅ | ❌ |
| `create` | `Project` | ✅ (via manage all) | ✅ | ❌ |
| `update` | `Project` | ✅ (via manage all) | 🔒 owner | ❌ |
| `delete` | `Project` | ✅ (via manage all) | 🔒 owner | ❌ |
| `get` | `Invite` | ✅ (via manage all) | ❌ | ❌ |
| `create` | `Invite` | ✅ (via manage all) | ❌ | ❌ |
| `delete` | `Invite` | ✅ (via manage all) | ❌ | ❌ |
| `manage` | `Billing` | ✅ (via manage all) | ❌ | ✅ |
| `get` | `Billing` | ✅ (via manage all) | ❌ | ✅ (via manage Billing) |
| `export` | `Billing` | ✅ (via manage all) | ❌ | ✅ (via manage Billing) |

### Decisão de design: ADMIN usa `manage all` + cannot/can overrides

Veja [`permissions.ts`](../../packages/auth/src/permissions.ts):

```ts
ADMIN(user, { can, cannot }) {
  can('manage', 'all')

  cannot(['transfer_ownership', 'update'], 'Organization')
  can(['transfer_ownership', 'update'], 'Organization', {
    ownerId: { $eq: user.id },
  })
},
```

**Como funciona:** CASL processa regras em ordem. `manage all` libera tudo, depois `cannot`
revoga as duas ações sensíveis em Organization, e por fim `can` libera apenas se
`ownerId === user.id`. Resultado: ADMIN pode tudo, mas só o owner pode transferir ou editar
a própria Org.

**Por que `manage all` em vez de listar tudo:** o spec original (`2026-05-27-auth-package-design.md`)
evitava `manage all` para preservar type-safety. **Essa decisão evoluiu** — a refatoração
posterior adotou `manage all` + `cannot/can` overrides por:

1. **Manutenibilidade** — adicionar uma nova ação em qualquer subject não precisa tocar em ADMIN
2. **Field-level overrides via `cannot` continuam funcionando** — type-safety preservada onde importa
3. **Subjects continuam tipados** via `AppAbilities` union — `ability.can('invite', 'NotAUser')` ainda é erro de compilação

## Padrão de uso

### Construir ability para um user

```ts
import { defineAbilityFor } from '@saas/auth'

const ability = defineAbilityFor({
  id: 'user-uuid',
  role: 'MEMBER',
})
```

### Checar permissão

```ts
// Pergunta simples
if (ability.can('create', 'Project')) {
  // ...
}

// Com instance (para checar conditions tipo ownerId)
if (ability.can('update', { __typename: 'Project', ownerId: user.id })) {
  // ...
}
```

> **Importante:** para conditions tipo `ownerId: { $eq: user.id }` funcionarem, o subject
> precisa ter `__typename` setado. Isso é feito via `detectSubjectType` em
> `defineAbilityFor` (veja [`index.ts`](../../packages/auth/src/index.ts) linha 29).

### Assertion helper

Use `assertCan` (em [`assert-can.ts`](../../packages/auth/src/assert-can.ts)) quando quiser
short-circuit com throw em vez de if/else.

## Type safety

`AppAbilities` em [`ability.ts`](../../packages/auth/src/ability.ts) é uma **union of tuples**:

```ts
type AppAbilities =
  | UserSubject
  | ProjectSubject
  | OrganizationSubject
  | InviteSubject
  | BillingSubject
  | ['manage', 'all']
```

Cada subject define quais actions são válidas para ele via Zod tuple. Exemplo:

```ts
// subjects/user.ts
export const userSubject = z.tuple([
  z.union([
    z.literal('manage'),
    z.literal('get'),
    z.literal('update'),
    z.literal('delete'),
    z.literal('invite'),
  ]),
  z.union([z.literal('User'), userSchema]),
])
```

**Consequência:** `ability.can('invite', 'Project')` é **erro de compilação** — `invite`
não está nas actions válidas de `ProjectSubject`. Type-safety preserva o domínio mesmo com
`manage all` no runtime.

## Action vocabulary por subject

| Subject | Actions definidas |
|---------|-------------------|
| `User` | `manage`, `get`, `update`, `delete`, `invite` |
| `Organization` | `manage`, `create`, `update`, `delete`, `transfer_ownership` |
| `Project` | `manage`, `get`, `create`, `update`, `delete` |
| `Invite` | `manage`, `get`, `create`, `delete` |
| `Billing` | `manage`, `get`, `export` |

`manage` é convenção CASL para "todas as actions desse subject".

## Adicionando uma nova action

1. Adicionar o literal em `subjects/<subject>.ts` (Zod tuple)
2. Atualizar a matriz neste documento
3. Atualizar `permissions.ts` se algum role específico precisa de override
4. ADMIN herda automaticamente via `manage all` (sem mexer)

## Related docs

- [domain-model.md](domain-model.md) — entidades que os subjects representam
- [../specs/2026-05-27-auth-package-design.md](../specs/2026-05-27-auth-package-design.md) — spec original (snapshot histórico de quando `manage all` ainda era evitado)
- [packages/auth/src/](../../packages/auth/src/) — implementação
