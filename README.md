# Next SaaS RBAC

Monorepo for studying and building a SaaS application with Next.js, shared packages, and role-based access control foundations.

## Apps

- `apps/web`: main SaaS application.
- `apps/docs`: documentation app.

## Packages

- `packages/ui`: shared React UI components.
- `packages/eslint-config`: shared ESLint configuration.
- `packages/typescript-config`: shared TypeScript configuration.

## Tech Stack

- Next.js
- React
- TypeScript
- pnpm
- Turborepo
- ESLint
- Prettier

## Getting Started

Install dependencies:

```bash
pnpm install
```

Start all apps in development mode:

```bash
pnpm dev
```

Build all apps and packages:

```bash
pnpm build
```

Run lint:

```bash
pnpm lint
```

Check TypeScript types:

```bash
pnpm check-types
```

## Project Structure

```txt
apps/
  docs/
  web/
packages/
  eslint-config/
  typescript-config/
  ui/
```

## Notes

This project is being built as a learning-focused SaaS foundation. The current setup includes the monorepo structure, shared configuration packages, and clean starter apps.
