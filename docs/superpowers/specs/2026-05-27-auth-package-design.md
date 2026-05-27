# Design: `@saas/auth` Package

**Date:** 2026-05-27
**Status:** Implemented — `feat/auth-package`, PR #6

## Summary

Private workspace package `@saas/auth` in `packages/auth/` that centralizes RBAC/ABAC
authorization using **CASL** (`@casl/ability` v6). Pure TypeScript library — no authentication,
no session management. Companion app `apps/api` provides a Node test backend.

## Scope

- **In scope:** RBAC role map (ADMIN/MEMBER), typed subjects (User, Project), `defineAbilityFor`, `apps/api` test backend
- **Out of scope:** Authentication, session handling, Next.js middleware helpers, external auth providers

## Package Structure

```
packages/auth/
├── src/
│   ├── roles.ts        # Role type + User interface
│   ├── project.ts      # Project interface
│   ├── ability.ts      # AppAbility (union-of-tuples) + createAppAbility
│   ├── permissions.ts  # role → permissions map
│   └── index.ts        # defineAbilityFor + re-exports
├── eslint.config.js    # flat config, extends @saas/eslint-config/base
├── package.json
└── tsconfig.json

apps/api/
├── src/
│   └── index.ts        # manual test of MEMBER and ADMIN abilities
├── eslint.config.js    # flat config, extends @saas/eslint-config/node
├── package.json        # dev: tsx watch src/index.ts
└── tsconfig.json
```

## Permission Matrix

| Action | Subject | ADMIN | MEMBER |
|--------|---------|-------|--------|
| `invite` | `User` | ✅ | ✅ |
| `invite` | `Project` | ❌ type error | ❌ type error |
| `create` | `Project` | ✅ | ❌ |
| `delete` | `Project` | ✅ | ❌ |
| `configure` | `Project` | ✅ | ❌ |

## Key Files

### `src/ability.ts`

```ts
type AppAbilities =
  | ['invite', UserSubject]
  | ['create' | 'delete' | 'configure', ProjectSubject]
```

Union-of-tuples restricts `invite` to `UserSubject` only. `ability.can('invite', 'Project')` is a
**compile-time TypeScript error**.

### `src/permissions.ts`

```ts
ADMIN(_user, { can }) {
  can('invite', 'User')
  can('create', 'Project')
  can('delete', 'Project')
  can('configure', 'Project')
},
MEMBER(_user, { can }) {
  can('invite', 'User')
},
```

### `src/index.ts`

```ts
export function defineAbilityFor(user: User) {
  const builder = new AbilityBuilder(createAppAbility)
  if (typeof permissions[user.role] === 'function') {
    permissions[user.role](user, builder)
  } else {
    throw new Error(`${user.role} not found`)
  }
  return builder.build()
}
```

## Design Decisions

| Decision | Choice | Reason |
|---|---|---|
| Authorization engine | CASL `@casl/ability` v6 | Isomorphic, TypeScript-first, RBAC + ABAC |
| `AppAbilities` format | Union of tuples | Restricts `invite` to `User` only at the type level |
| No `manage all` for ADMIN | Explicit permissions | `manage all` wildcard bypasses type restrictions at CASL runtime |
| `invite` on `Project` | Forbidden by type | Semantically nonsensical — you invite a User, not a Project |
| Build step | None | Source consumed directly via `exports` (same as `@saas/ui`) |
| ESLint config | `base` for auth, `node` for api | Auth is framework-agnostic; API is Node-only |
| Prettier | Root-level only | Root `format` script covers all packages |
| `noEmit: true` | Added to auth tsconfig | Prevents tsc from emitting into `src/` if run outside `check-types` |
| `import type` | Used in permissions/index | `isolatedModules: true` requires it for type-only imports |
