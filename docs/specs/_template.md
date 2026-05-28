# Design: <Feature Name>

**Date:** YYYY-MM-DD
**Status:** Proposed | Approved | Implemented — `branch-name`, PR #N

> **Como usar este template:** copie para `docs/specs/YYYY-MM-DD-feature-name.md`, ajuste o
> nome do arquivo com a data + slug curto, e preencha as seções. Apague esta nota e qualquer
> seção que não fizer sentido para a feature. Bilíngue: títulos e termos técnicos em inglês,
> prosa em português.

## Summary

<1-2 parágrafos: o que essa feature é, por que existe agora, qual problema resolve.>

## Scope

- **In scope:** <bullets do que está sendo entregue neste PR>
- **Out of scope:** <bullets do que **deliberadamente** ficou de fora — útil pra responder "por que não X?">

## Design

<Estrutura, fluxos, decisões. Subseções como achar útil — exemplos comuns:>

### Architecture / Structure

<Arquivos novos, mudanças no folder layout, diagramas Mermaid se relevantes>

### Domain / Data model

<Schema changes, novas entidades, migrations. Linke para
[architecture/domain-model.md](../architecture/domain-model.md) se a feature mexe no domínio.>

### API / Contract

<Novas rotas, payloads, error codes. Use tabelas pra schemas.>

### Permissions

<Mudanças em RBAC. Linke para
[architecture/rbac-permissions.md](../architecture/rbac-permissions.md) se for evolução
da matriz.>

## Key Files

<Lista de arquivos criados/modificados, com 1 linha de propósito.>

| Action | File | Purpose |
|--------|------|---------|
| Create | `path/to/file.ts` | <propósito> |
| Modify | `path/to/other.ts` | <o que mudou> |

## Design Decisions

| Decision | Choice | Reason |
|---|---|---|
| <decisão> | <opção escolhida> | <por que essa em vez das outras> |

## Out of Scope / Future Work

<O que **não** cabe neste PR mas é trabalho previsível. Cada item vira candidato a issue ou
spec futuro. Se a feature deixa `architecture/<topic>.md` desatualizado, mencione aqui.>

## Verification

<Como testar end-to-end. Comandos concretos sempre que possível.>

## Related

- Architecture: [docs/architecture/<file>.md](../architecture/<file>.md)
- ADR: [docs/adr/<NNNN-decision>.md](../adr/<NNNN-decision>.md)
- Previous spec: [docs/specs/<date>-related.md](<date>-related.md)
