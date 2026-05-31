# Spec — GitHub OAuth Login

**Date:** 2026-05-31
**Status:** Implemented — `feat/api-oauth-github`, PR #12
**Author:** Pedro Souza

## Contexto

Adicionar login social via GitHub. O fluxo de autenticação por e-mail/senha (PR #22) já está
estabelecido; este spec estende a camada de auth com um segundo método de login usando OAuth 2.0.

## Problema

Usuários precisam de uma alternativa ao cadastro manual. GitHub OAuth melhora o onboarding:
sem senha para lembrar, e-mail já verificado, avatar disponível imediatamente.

## Design

### Rota

```
POST /sessions/github
```

**Body:** `{ code: string }` — código OAuth recebido do callback do frontend após o redirect do GitHub.

**Resposta de sucesso (200):** `{ token: string }` — JWT idêntico ao emitido por `/sessions/password`.

### Helper

`apps/api/src/http/lib/github.ts` — função `getGithubUserData(code)` encapsula:

1. POST `https://github.com/login/oauth/access_token` → troca `code` por `access_token`
2. GET `https://api.github.com/user` → dados do usuário (id, name, avatar_url)
3. GET `https://api.github.com/user/emails` → lista de e-mails; filtra por `primary && verified`

Retorna `{ githubId, name, email, avatarUrl }`.

### Lógica da rota

```
1. getGithubUserData(code)
   ├── code inválido → 400 "Invalid GitHub OAuth code."
   └── sem e-mail verificado → 400 "Your GitHub account has no verified primary email."

2. prisma.user.findFirst onde Account(provider=GITHUB, providerAccountId=githubId) existe
   └── encontrou → usa esse User (caminho feliz, logins recorrentes)

3. Não encontrou Account:
   a. prisma.user.findUnique(email) existe?
      └── sim → cria Account(GITHUB) vinculada ao User existente (auto-link de contas)
   b. não existe User → $transaction:
      ├── user.create(name, email, avatarUrl)
      ├── account.create(GITHUB, githubId, userId)
      └── auto-attach por domínio (mesmo padrão de POST /users)

4. jwt.sign({ sub: user.id }, { expiresIn: '7d' }) → 200 { token }
```

### Env vars

Já declaradas como `.optional()` em `env.ts` e no `turbo.json` (desde PR #10):

| Var | Propósito |
|-----|-----------|
| `GITHUB_OAUTH_CLIENT_ID` | ID do OAuth App no GitHub |
| `GITHUB_OAUTH_CLIENT_SECRET` | Secret do OAuth App |
| `GITHUB_OAUTH_CLIENT_REDIRECT_URI` | URI de redirect registrada no GitHub |

Validação da presença dessas vars é feita **dentro de `getGithubUserData`** (nível de rota),
não no startup global — conforme [ADR-0002](../adr/0002-github-oauth-env-optional.md).

## Decisões de design

### Auto-link de contas por e-mail

Quando um usuário tem conta por senha (`passwordHash`) e faz login via GitHub com o **mesmo
e-mail**, o sistema cria um `Account(GITHUB)` e vincula ao `User` existente em vez de retornar
erro. Isso permite que o usuário use os dois métodos de login a partir desse ponto.

Alternativa rejeitada: retornar 400. Causaria fricção desnecessária e quebraria UX de usuários
que criaram conta antes do OAuth ser adicionado.

### avatarUrl e name: somente na criação

Os campos `avatarUrl` e `name` vêm do GitHub apenas na criação do User. Logins subsequentes
não sobrescrevem esses campos, preservando eventuais customizações feitas pelo usuário na
plataforma.

## Arquivos criados/modificados

| Arquivo | Ação |
|---------|------|
| `apps/api/src/http/lib/github.ts` | criado — helper `getGithubUserData` |
| `apps/api/src/http/routes/auth/authenticate-with-github.ts` | criado — route plugin |
| `apps/api/src/http/routes/auth/index.ts` | modificado — registra nova rota |
| `apps/api/test/routes/auth/authenticate-with-github.test.ts` | criado — testes (5 cenários) |
| `docs/architecture/api-routes.md` | atualizado — novo endpoint documentado |
| `docs/architecture/auth-flow.md` | atualizado — fluxo OAuth adicionado |

## Testes

Cobertura via `vi.mock` no Prisma e `vi.mock` em `getGithubUserData`:

| Cenário | Status esperado |
|---------|-----------------|
| Account GitHub já existe | 200 com token |
| Primeiro login GitHub, usuário novo | 200, cria User + Account |
| Primeiro login GitHub, e-mail já tem conta por senha | 200, cria Account (auto-link) |
| E-mail no domínio de Org com auto-attach | 200, cria Member |
| Código OAuth inválido | 400 |
