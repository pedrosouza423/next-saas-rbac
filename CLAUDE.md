# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Install dependencies
pnpm install

# Dev (all apps)
pnpm dev

# Dev (single app)
pnpm --filter=web dev       # web on :3000
pnpm --filter=docs dev      # docs on default port

# Build
pnpm build
pnpm --filter=web build     # build single app

# Lint (0 warnings allowed)
pnpm lint

# Type check
pnpm check-types

# Format
pnpm format
```

## Architecture

This is a **pnpm + Turborepo monorepo** for a SaaS app with RBAC (role-based access control).

```
apps/
  web/    # Main SaaS app — Next.js 16, React 19, port 3000
  docs/   # Docs site — Next.js 16, React 19
packages/
  ui/                 # @saas/ui — shared React component library
  eslint-config/      # @saas/eslint-config — shared ESLint flat configs
  typescript-config/  # @saas/typescript-config — shared tsconfig.json bases
```

### Key conventions

**Shared UI package** — `@saas/ui` exports directly from source via `"exports": { "./*": "./src/*.tsx" }`. Import components as `@saas/ui/button`, `@saas/ui/card`, etc. No build step needed.

**ESLint** — All packages use the flat config format (`eslint.config.js`). The `eslint-plugin-only-warn` package downgrades all errors to warnings, but `--max-warnings 0` is enforced in every `lint` script, so CI still fails on any violation. The `turbo/no-undeclared-env-vars` rule enforces that all env vars accessed in code are declared in `turbo.json`'s `env` or `passThroughEnv`.

**TypeScript** — `apps/web` runs `next typegen` before `tsc --noEmit` to generate route types. Shared tsconfig bases live in `@saas/typescript-config`.

**Turbo task graph** — `build` and `check-types` depend on `^build`/`^check-types` (dependencies run first). `dev` is persistent and uncached. Pass `--filter=<app>` to Turbo for single-package operations.
