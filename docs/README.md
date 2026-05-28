# `next-saas-rbac` — Documentation Index

Bem-vindo. Este diretório é a **biblioteca de referência durável** do projeto. Para comandos do
dia-a-dia e convenções operacionais, veja [CLAUDE.md](../CLAUDE.md) na raiz.

## How to navigate

A documentação está organizada em **três camadas semânticas**, cada uma com regra própria de
quando ler e quando atualizar:

| Camada | Pasta | Quando ler | Quando atualizar |
|---|---|---|---|
| **Evergreen** | [architecture/](architecture/) | Para entender "o que o projeto É hoje" — arquitetura, domínio, RBAC, setup | Quando a arquitetura muda — sobrescrever no lugar (sem datar) |
| **Time-bound** | [specs/](specs/) | Para entender "o que foi decidido neste PR" — snapshot do design no momento | Um por feature/PR significativo; **nunca editar** depois de implementado |
| **Decisões** | [adr/](adr/) | Para entender "por que escolhemos X e não Y" | Quando uma decisão arquitetural surgir e for re-questionável |

> **Regra prática:** se você precisa saber a verdade atual sobre algo, comece em
> `architecture/`. Se você precisa de contexto histórico ("por que isso foi feito assim?"),
> vá em `specs/` ou `adr/`.

## Architecture (evergreen)

- [architecture/monorepo-overview.md](architecture/monorepo-overview.md) — mapa de sistema:
  apps, packages, dependências, Turbo task graph, convenções globais
- [architecture/domain-model.md](architecture/domain-model.md) — ERD do schema Prisma:
  entidades, relações, tenancy & ownership, delete behavior
- [architecture/rbac-permissions.md](architecture/rbac-permissions.md) — matriz CASL completa:
  subjects × actions × roles, padrão de uso, decisões de type-safety
- [architecture/local-development.md](architecture/local-development.md) — setup local
  consolidado: docker, env vars, portas, comandos por workflow

## Specs (time-bound)

| Spec | Status | PR |
|------|--------|----|
| [2026-05-27-auth-package-design.md](specs/2026-05-27-auth-package-design.md) | Implemented | [#6](https://github.com/pedrosouza423/next-saas-rbac/pull/6) |
| [2026-05-27-dark-mode-next-themes-design.md](specs/2026-05-27-dark-mode-next-themes-design.md) | Approved | — |
| [2026-05-28-api-fastify-prisma-setup.md](specs/2026-05-28-api-fastify-prisma-setup.md) | Implemented | [#8](https://github.com/pedrosouza423/next-saas-rbac/pull/8) |
| [2026-05-28-apps-docs-purpose.md](specs/2026-05-28-apps-docs-purpose.md) | Proposed | — |

Template para novos specs: [specs/_template.md](specs/_template.md).

## ADRs (architectural decision records)

Estrutura preparada, conteúdo dos ADRs será escrito conforme cada decisão for revisitada.
Veja [adr/README.md](adr/README.md) para o template e a fila priorizada.

## Plans

[plans/](plans/) guarda planos de execução de specs aprovados — material de uso interno do
agente para implementar. Plans são **descartáveis após o merge** do PR correspondente.

## Conventions for new specs

### Nomenclatura

| Tipo | Onde | Nome | Exemplo |
|---|---|---|---|
| Feature/PR significativa | `specs/` | `YYYY-MM-DD-feature-name.md` | `2026-05-28-api-fastify-prisma-setup.md` |
| Mudança arquitetural durável | `architecture/` | `topic-name.md` (sobrescreve) | `domain-model.md` |
| Decisão "por que X e não Y" | `adr/` | `NNNN-decision-slug.md` | `0001-pnpm-turborepo.md` |
| Plano de execução de spec | `plans/` | `YYYY-MM-DD-feature-name.md` | `2026-05-27-dark-mode-next-themes.md` |

### Status field (specs/)

- `Proposed` — em discussão
- `Approved` — design aceito, ainda não implementado
- `Implemented — <branch>, PR #N` — merged

### Idioma

**Bilíngue:** títulos e nomes técnicos em inglês, prosa e tabelas em português. Veja qualquer
spec existente como referência (padrão dos três primeiros).

### Quando criar um spec

Crie um spec **antes** de abrir um PR significativo. Critério: se a mudança envolve uma
**decisão de design** (não só implementação trivial), ela merece spec. Exemplos:

- ✅ Novo app/package, novo subsystem, mudança de schema, novo fluxo de auth, escolha de
  biblioteca grande
- ❌ Bugfix, rename, type tweak, CI fix

## Backlog — Specs not yet written

Itens **deliberadamente** não escritos ainda — registrados aqui para que o próximo PR que tocar
a área saiba que existe dívida documental e possa endereçá-la junto:

| Doc | Quando criar | Trigger |
|---|---|---|
| `architecture/api-routes.md` | Quando API tiver rotas além de `/health` | Primeiro endpoint de negócio |
| `architecture/auth-flow.md` | Quando login/sessões forem implementados | PR de autenticação |
| `architecture/deployment.md` | Quando primeira pipeline CI/CD subir | PR de deploy |
| `architecture/ui-components.md` | Quando `@saas/ui` passar de 5+ componentes | PR que adiciona o 6º componente |
| `specs/<date>-apps-web-features.md` | Primeiro spec real do front | PR com primeira tela de negócio |
| `adr/0001-pnpm-turborepo.md` | Quando alguém questionar a escolha | Re-discussão de toolchain |
| `adr/0002-source-only-package-exports.md` | Quando precisar adicionar build step | Mudança no padrão de export |
| `adr/0003-fastify-over-next-api-routes.md` | Quando alguém propuser usar Next API routes | Re-discussão de arquitetura |
| `adr/0004-casl-no-manage-all.md` | Quando alguém propuser `manage all` para ADMIN | Re-discussão de RBAC |
| `adr/0005-prisma-7-driver-adapter-pg.md` | Quando alguém propuser voltar para Prisma binary engine | Re-discussão de DB |
