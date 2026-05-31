# Architecture — Authentication Flow

**Last updated:** 2026-05-31
**Implemented in:** PR #22 (`feat/api-auth-routes`), PR #12 (`feat/api-oauth-github`)

Fluxos de autenticação suportados pela API: e-mail/senha e GitHub OAuth.
Veja [ADR-0002](../adr/0002-github-oauth-env-optional.md) e
[ADR-0003](../adr/0003-jwt-auth-strategy.md).

## Visão geral

```
Client                API                     DB
  |                    |                       |
  |-- POST /users ---→ |                       |
  |                    |-- findUnique(email) →  |
  |                    |←-- null               |
  |                    |-- $transaction ------→ |
  |                    |   user.create          |
  |                    |   member.create?       |
  |                    |←-- user               |
  |←-- 201 {userId} -- |                       |
  |                    |                       |
  |-- POST /sessions/password --→              |
  |                    |-- findUnique(email) →  |
  |                    |←-- user               |
  |                    |   bcrypt.compare()     |
  |←-- 200 {token} --- |                       |
  |                    |                       |
  |-- GET /profile --> |                       |
  |   Authorization:   |   jwt.verify()        |
  |   Bearer <token>   |-- findUnique(id) ----→|
  |                    |←-- user               |
  |←-- 200 {user} ---- |                       |
```

## Fluxos detalhados

### 1. Criar conta — `POST /users`

```
Body: { name, email, password }
```

1. Verifica se já existe user com esse `email` → 409 se sim
2. `bcrypt.hash(password, BCRYPT_ROUNDS)` (rounds = 10)
3. `prisma.$transaction`:
   - `user.create({ name, email, passwordHash })`
   - Se `email` pertence a domínio de uma Org com `shouldAttachUsersByDomain = true`:
     - `member.create({ userId, organizationId, role: 'MEMBER' })`
4. Retorna `201 { userId }`

**Auto-attach por domínio:** extrai sufixo do e-mail (`pedro@acme.com` → `acme.com`),
busca Org com `domain = 'acme.com'` e `shouldAttachUsersByDomain = true`. Se encontrar,
cria membro automaticamente. Lógica dentro da transação — se member.create falhar, o user
é revertido.

### 2. Login — `POST /sessions/password`

```
Body: { email, password }
```

1. `user.findUnique({ where: { email } })` → 400 se não encontrar
2. Se `user.passwordHash` for null (conta OAuth-only) → 400
3. `bcrypt.compare(password, user.passwordHash)` → 400 se não bater
4. `app.jwt.sign({ sub: user.id }, { expiresIn: '7d' })` (síncrono)
5. Retorna `200 { token }`

### 3. Perfil autenticado — `GET /profile`

```
Header: Authorization: Bearer <token>
```

1. Middleware `auth` (registrado globalmente) chama `jwt.verify()` → 401 se inválido
2. `request.getCurrentUserId()` extrai `sub` do payload
3. `user.findUnique({ where: { id: userId } })` → 404 se user deletado com JWT válido
4. Retorna `200 { id, name, email, avatarUrl }`

### 4. Solicitar reset de senha — `POST /password/recover`

```
Body: { email }
```

1. `user.findUnique({ where: { email } })` — se não encontrar, **continua normalmente** (não vaza existência do e-mail)
2. Se user existe: `token.create({ type: 'PASSWORD_RECOVER', userId })`
3. Retorna `201 {}` sempre

> **Sem envio de e-mail nesta fase.** O token UUID precisa ser recuperado via banco ou logs de
> debug. Integração com serviço de e-mail é trabalho futuro.

### 5. Confirmar reset de senha — `POST /password/reset`

```
Body: { code: uuid, password }
```

1. `token.findUnique({ where: { id: code } })` → 400 `'Invalid token.'` se não existir
2. Verifica `token.type === 'PASSWORD_RECOVER'` → 400 `'Invalid token.'` se divergir
3. Verifica `token.createdAt < now - 1h` → deleta token + 400 `'Token expired.'`
4. `bcrypt.hash(password, BCRYPT_ROUNDS)`
5. `prisma.$transaction([user.update(passwordHash), token.delete()])` atômico
6. Retorna `204`

## Token JWT

| Campo | Valor |
|-------|-------|
| Algoritmo | HS256 (padrão `@fastify/jwt`) |
| Payload | `{ sub: userId, iat, exp }` |
| Expiração | 7 dias |
| Secret | `JWT_SECRET` env var (mín. 8 chars) |

Veja [ADR-0003](../adr/0003-jwt-auth-strategy.md) para a decisão de JWT vs session e a
escolha de bcrypt rounds.

## Middleware de autenticação

Registrado em `src/http/middlewares/auth.ts` e aplicado globalmente via `app.register(auth)`.
Adiciona `request.getCurrentUserId()` — helper que verifica o JWT e retorna o `sub`.

Rotas públicas (não requerem token): `POST /users`, `POST /sessions/password`,
`POST /password/recover`, `POST /password/reset`.

Rotas protegidas (requerem `Authorization: Bearer <token>`): `GET /profile` e qualquer
endpoint futuro que chame `request.getCurrentUserId()`.

### 6. GitHub OAuth — `POST /sessions/github`

```
Body: { code }
```

1. `getGithubUserData(code)` (helper em `src/http/lib/github.ts`):
   - POST `github.com/login/oauth/access_token` → troca `code` por `access_token`
   - GET `api.github.com/user` + `api.github.com/user/emails`
   - Filtra e-mail `primary && verified` → 400 se não houver
2. `account.findFirst({ provider: GITHUB, providerAccountId: githubId })`:
   - Encontrou → carrega User vinculado
3. Não encontrou Account:
   - `user.findUnique({ email })` existe? → cria Account(GITHUB) vinculada (auto-link)
   - Não existe → `$transaction`: cria User + Account + auto-attach por domínio
4. `jwt.sign({ sub: user.id }, { expiresIn: '7d' })` → `200 { token }`

**Auto-link:** usuário com conta por senha que faz GitHub OAuth com o mesmo e-mail tem o
Account(GITHUB) criado e vinculado automaticamente — sem perder a senha existente.

## Related docs

- [domain-model.md](domain-model.md) — modelo `User`, `Token`, `Account`
- [api-routes.md](api-routes.md) — referência de todos os endpoints
- [../adr/0003-jwt-auth-strategy.md](../adr/0003-jwt-auth-strategy.md) — decisões de JWT e bcrypt
- [../specs/2026-05-29-api-auth-routes.md](../specs/2026-05-29-api-auth-routes.md) — spec original
