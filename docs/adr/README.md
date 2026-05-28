# Architectural Decision Records (ADRs)

ADRs documentam **decisões arquiteturais** — escolhas com trade-offs reais que são previsíveis
de serem re-questionadas no futuro ("por que não X?"). Não documentam implementação trivial,
nem tudo que entra num PR.

## Quando criar um ADR

- ✅ Quando alguém pergunta "por que X e não Y?" pela 2ª vez
- ✅ Quando uma decisão envolve trade-off não-trivial (perf vs DX, simplicidade vs flexibilidade)
- ✅ Quando você quer registrar uma decisão pra evitar re-discussão em 6 meses
- ❌ Implementação trivial, bugfix, escolha óbvia
- ❌ Decisões que vivem melhor num spec (que tem mais contexto da feature)

## Formato

ADRs são curtos — 1 página, 3 seções obrigatórias:

```markdown
# ADR-NNNN: <título da decisão>

**Date:** YYYY-MM-DD
**Status:** Proposed | Accepted | Deprecated | Superseded by ADR-MMMM

## Context

<O que estava em jogo. Por que essa decisão precisou ser tomada. Quais constraints existiam.>

## Decision

<O que decidimos fazer. Seja explícito — "escolhemos X em vez de Y e Z" é melhor que "vamos com X".>

## Consequences

<O que muda como resultado. Trade-offs aceitos. Coisas que ficam mais fáceis e mais difíceis.>
```

Nomenclatura: `NNNN-decision-slug.md` (4 dígitos pra permitir até 9999 ADRs sem renumerar).

## ADR Index

Nenhum ADR aceito ainda — só fila priorizada abaixo.

## Backlog (priorizado)

Decisões já tomadas no código mas **não documentadas como ADR**. A ordem reflete probabilidade
de serem questionadas e custo de reversão. Escreva quando for relevante (ex: alguém propõe o
contrário, ou em onboarding pra explicar uma vez só).

| Número | Decisão | Trigger esperado | Onde está hoje |
|--------|---------|------------------|----------------|
| `0001` | pnpm + Turborepo (vs npm/yarn workspaces, vs nx, vs single-repo) | Alguém propor migrar para nx | [README.md](../../README.md), [turbo.json](../../turbo.json) |
| `0002` | Source-only package exports (sem build step em `@saas/ui` e `@saas/auth`) | Alguém propor adicionar `tsup`/`bun build` | [packages/ui/package.json](../../packages/ui/package.json), [packages/auth/package.json](../../packages/auth/package.json) |
| `0003` | Fastify separado (vs Next.js API routes / route handlers) | Discussão de simplicidade vs separação | [apps/api/src/server.ts](../../apps/api/src/server.ts) |
| `0004` | ADMIN usa `manage all` + `cannot/can` overrides (decisão revisada do spec original) | Quando alguém questionar o uso de `manage all` e propuser voltar a permissões explícitas | [packages/auth/src/permissions.ts](../../packages/auth/src/permissions.ts), [architecture/rbac-permissions.md](../architecture/rbac-permissions.md) |
| `0005` | Prisma 7 com `@prisma/adapter-pg` (vs Prisma 6 com binary engine, vs Drizzle) | Reset de complexity budget | [apps/api/prisma.config.ts](../../apps/api/prisma.config.ts), [specs/2026-05-28-api-fastify-prisma-setup.md](../specs/2026-05-28-api-fastify-prisma-setup.md) |

## Related

- [../README.md](../README.md) — índice geral de docs
- [../specs/_template.md](../specs/_template.md) — template para specs (não ADRs)
