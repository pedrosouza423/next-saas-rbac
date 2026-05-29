# ADR-0002: GitHub OAuth env vars are optional

**Date:** 2026-05-29
**Status:** Accepted

## Context

O schema de validação de ambiente (via Zod) valida todas as env vars no startup do servidor.
GitHub OAuth requer três variáveis (`GITHUB_OAUTH_CLIENT_ID`, `GITHUB_OAUTH_CLIENT_SECRET`,
`GITHUB_OAUTH_CLIENT_REDIRECT_URI`), mas essas são necessárias apenas para rotas de OAuth
(PR #3), **não** para autenticação por e-mail/senha (PR #2) ou qualquer outra feature atual.

Problema: se as vars fossem obrigatórias no schema global, desenvolvimento local e testes
quebrariam até que as credenciais do GitHub fossem configuradas — mesmo que ninguém esteja
testando OAuth ainda.

## Decision

As env vars de GitHub OAuth são marcadas como `.optional()` no `src/env.ts`:

```ts
const envSchema = z.object({
  DATABASE_URL: z.url(),
  PORT: z.coerce.number().default(3333),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  JWT_SECRET: z.string().min(1), // obrigatória
  GITHUB_OAUTH_CLIENT_ID: z.string().optional(), // opcional
  GITHUB_OAUTH_CLIENT_SECRET: z.string().optional(), // opcional
  GITHUB_OAUTH_CLIENT_REDIRECT_URI: z.string().optional(), // opcional
})
```

Quando PR #3 implementar rotas de OAuth, essas rotas específicas validarão a presença das
credenciais no nível da rota, não global.

## Consequences

- Local dev funciona sem configurar GitHub OAuth
- Testes passam sem credenciais de terceiros
- Erro de OAuth vars faltando é **runtime error na rota** em vez de erro de startup —
  mais claro e direto para o desenvolvedor
- Trade-off: necessidade de validação dupla (env global + rota local), aceitável dado que
  OAuth é apenas uma feature entre várias
- `JWT_SECRET` permanece obrigatória — é usada em **qualquer** endpoint autenticado

