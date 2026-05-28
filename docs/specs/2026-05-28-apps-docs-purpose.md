# Design: `apps/docs` — Purpose & Content Strategy

**Date:** 2026-05-28
**Status:** Proposed — pending alignment

## Summary

`apps/docs` existe hoje como um shell vazio do Next.js (porta 3001), com `@saas/ui` instalado e
nenhuma página real além da `app/page.tsx` boilerplate. Antes que vire dívida técnica
("por que esse app existe se está vazio?"), precisamos decidir explicitamente o **propósito**
dele — ou removê-lo.

## Problem

Três cenários plausíveis, sem decisão tomada:

1. **Docs internas para devs** — render dos `.md` em [docs/](../) num site navegável (Fumadocs/Nextra)
2. **Docs públicas para usuários da SaaS** — landing, features, guides, API reference
3. **Dead code** — deletar, liberar a porta 3001

A ambiguidade já gera atrito: o spec da API ([2026-05-28-api-fastify-prisma-setup.md](2026-05-28-api-fastify-prisma-setup.md))
e o spec do auth ([2026-05-27-auth-package-design.md](2026-05-27-auth-package-design.md))
não sabem se devem linkar para `apps/docs` (renderizado) ou para `docs/` (markdown raw).

## Options

### Option A — Renderizar `docs/` como site interno (recomendado)

`apps/docs` consome os `.md` deste diretório (architecture/, specs/, adr/, plans/) e renderiza
via **Fumadocs** ou **Nextra**. Único site interno, conteúdo vive em markdown versionado.

**Stack candidato:**
- **Fumadocs** — feito pra App Router (Next 16+), MDX-first, busca nativa, mais moderno
- **Nextra** — mais maduro, App Router suportado, design opinated

**Vantagens:**
- Source único: editar markdown e ver renderizado
- Search built-in
- Diagramas Mermaid renderizam (ambos suportam)
- Zero duplicação de conteúdo

**Custos:**
- Setup inicial (~1 PR só pro framework)
- Aprende-se um framework de docs

### Option B — Docs públicas separadas

`apps/docs` vira o site público (landing, features, pricing, public API reference para
desenvolvedores integrarem). `docs/` markdown permanece interno e separado.

**Vantagens:**
- Separação clara: interno vs público
- Liberdade de design para o público

**Custos:**
- Duplicação inevitável (descrição de features aparece nos dois lugares)
- Ainda precisa decidir como navegar nos docs internos

### Option C — Deletar `apps/docs`

Remove o app. `docs/` markdown é consumido direto no GitHub/IDE (que já renderiza markdown e
Mermaid). Porta 3001 liberada.

**Vantagens:**
- Menos código pra manter
- Markdown no GitHub já tem busca e navegação razoável

**Custos:**
- Sem deep-linking estável entre docs (anchors do GitHub são frágeis)
- Sem search local

## Recommendation

**Option A com Fumadocs.** Justificativa:

1. O backlog em [../README.md](../README.md) projeta crescimento dos docs — vamos ter
   `architecture/api-routes.md`, `architecture/auth-flow.md`, `architecture/deployment.md`,
   ADRs 0001–0005, etc. Search e navegação compensam o setup.
2. O conteúdo já está em markdown e estruturado por pasta — Fumadocs consome direto.
3. Docs públicas (Option B) podem ser feitas depois num app à parte (`apps/marketing` ou
   landing-only em `apps/web`).
4. Não precisamos publicar o site — pode rodar local-only ou em deploy interno (Vercel free
   tier, Netlify), sem custo recorrente.

## Out of scope (deste spec)

- Escolha final entre Fumadocs vs Nextra — vira um spec próprio (`<date>-apps-docs-framework.md`)
  quando começarmos
- Deploy do site — depois que o framework estiver wired
- Landing/marketing pública — outro app/feature, não este

## Open questions

- [ ] **Decisão final:** A, B ou C?
- [ ] Se A: Fumadocs ou Nextra? (Tendência: Fumadocs por ser App Router-first)
- [ ] Se A: deploy público ou só local-dev?
- [ ] Se A: como tratar specs datados (mostrar todos? ocultar implementados?)

## Related

- Architecture: [../architecture/monorepo-overview.md](../architecture/monorepo-overview.md)
- Backlog: [../README.md](../README.md) (seção "Backlog")
