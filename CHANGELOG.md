# Changelog

## [Unreleased] — branch `setup/initial-setup` (PR [#2](https://github.com/pedrosouza423/next-saas-rbac/pull/2))

### Added

- Monorepo base com pnpm + Turborepo: `package.json`, `turbo.json`, `pnpm-workspace.yaml`, `.npmrc`, `.gitignore`
- Pacote `@saas/eslint-config` (`packages/eslint-config/`) com três perfis:
  - `base` — regras compartilhadas por todos os pacotes (`eslint-plugin-turbo`, `eslint-plugin-only-warn`)
  - `next-js` — para apps Next.js (React, React Hooks, `@next/eslint-plugin-next`)
  - `react-internal` — para bibliotecas React internas
- Pacote `@saas/typescript-config` (`packages/typescript-config/`) com bases para Next.js e React library
- Pacote `@saas/ui` (`packages/ui/`) — biblioteca de componentes React compartilhada, exporta direto do source via `"exports": { "./*": "./src/*.tsx" }` sem build step
- Apps `web` (porta 3000) e `docs` (porta 3001) com Next.js 16 + React 19, páginas limpas sem boilerplate
- `CLAUDE.md` com documentação de comandos e arquitetura para o Claude Code

### Changed

- Escopo dos pacotes internos renomeado de `@repo/*` (padrão do template Turborepo) para `@saas/*`
- `README.md` substituído pelo template padrão do Turborepo (será atualizado com conteúdo específico do projeto)

### Fixed

- `packages/eslint-config/next.js`: adicionado `globals.browser` em `languageOptions` — sem isso, `window`, `document` e `navigator` causariam erros de `no-undef` nos apps Next.js ([commit 53243a8](https://github.com/pedrosouza423/next-saas-rbac/commit/53243a8))
- `packages/eslint-config/next.js` e `react-internal.js`: removida duplicação de `js.configs.recommended`, `eslintConfigPrettier` e `tseslint.configs.recommended` que já estavam inclusos via `...baseConfig` ([commit 53243a8](https://github.com/pedrosouza423/next-saas-rbac/commit/53243a8))

### Removed

- Boilerplate do template Turborepo: telas de boas-vindas, links UTM, prop `appName` no `Button`, links com tracking no `Card`
- Imports não utilizados em `next.js` e `react-internal.js` após remoção das camadas duplicadas
