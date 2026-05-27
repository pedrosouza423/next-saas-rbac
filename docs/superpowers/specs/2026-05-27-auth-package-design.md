# Design: `@saas/auth` Package

**Date:** 2026-05-27
**Status:** Approved

## Summary

Create a new private workspace package `@saas/auth` in `packages/auth/` to house RBAC (Role-Based Access Control) and ABAC (Attribute-Based Access Control) logic for the SaaS platform. The package is a pure TypeScript library — no authentication, no session management — with ESLint and TypeScript configured following monorepo conventions.

## Scope

- **In scope:** Package scaffold with tooling (ESLint, TypeScript), `src/` structure, stub entry point
- **Out of scope:** RBAC/ABAC implementation logic, authentication, session handling, Next.js middleware helpers, external auth providers

## Package Structure

```
packages/auth/
├── src/
│   └── index.ts          # public exports
├── eslint.config.js      # flat config, extends @saas/eslint-config/base
├── package.json
└── tsconfig.json
```

## Files

### `package.json`

```json
{
  "name": "@saas/auth",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "exports": { ".": "./src/index.ts" },
  "scripts": {
    "lint": "eslint . --max-warnings 0",
    "check-types": "tsc --noEmit"
  },
  "devDependencies": {
    "@saas/eslint-config": "workspace:*",
    "@saas/typescript-config": "workspace:*",
    "@types/node": "^22.15.3",
    "eslint": "^9.39.1",
    "typescript": "5.9.2"
  }
}
```

- `private: true` — not publishable
- `type: "module"` — ESM, consistent with the other packages
- `exports` — single entry point via source file (no build step, same pattern as `@saas/ui`)
- No `dependencies` yet — RBAC/ABAC deps added when implementation begins
- Prettier runs from root (`format` script covers `**/*.ts`), no per-package config needed

### `eslint.config.js`

```js
import { config } from "@saas/eslint-config/base";
export default config;
```

Uses `base` (not `react-internal` or `next-js`) since this is a framework-agnostic library.

### `tsconfig.json`

```json
{
  "extends": "@saas/typescript-config/base.json",
  "compilerOptions": { "rootDir": "src" },
  "include": ["src"],
  "exclude": ["node_modules"]
}
```

Extends `base.json` (ES2022, NodeNext resolution, strict). No `outDir` — source is consumed directly within the workspace without a compile step.

### `src/index.ts`

```ts
export {};
```

Empty stub. RBAC/ABAC exports added in subsequent implementation.

## Design Decisions

| Decision | Choice | Reason |
|---|---|---|
| `src/` directory vs flat | `src/` | Scales cleanly when splitting `rbac.ts` and `abac.ts` |
| Subpath exports | Single `.` entry | Premature to split before implementation exists |
| Build step | None | Matches `@saas/ui` pattern — source consumed directly in workspace |
| ESLint config | `base` | Library is framework-agnostic |
| Prettier | Root-level only | Root `format` script already covers all packages |
