# Architecture — API Routes

**Last updated:** 2026-05-31
**Base URL:** `http://localhost:3333` (dev)
**Swagger UI:** `http://localhost:3333/docs`

Referência de todos os endpoints da API Fastify. Atualizar aqui quando rotas forem
adicionadas, removidas ou tiverem contratos alterados.

## Autenticação

Rotas protegidas requerem:
```
Authorization: Bearer <jwt>
```

O token é obtido em `POST /sessions/password`. Expiração: 7 dias.

Veja [auth-flow.md](auth-flow.md) para os fluxos completos.

## Endpoints

### Sistema

| Method | Path | Auth | Status | Descrição |
|--------|------|------|--------|-----------|
| `GET` | `/health` | — | `200` | Liveness check (testa conexão com DB) |

**`GET /health` response:**
```json
{ "status": "ok", "db": "ok" }
```

---

### Auth — `tags: ['auth']`

| Method | Path | Auth | Success | Descrição |
|--------|------|------|---------|-----------|
| `POST` | `/users` | — | `201` | Criar conta |
| `POST` | `/sessions/password` | — | `200` | Login por e-mail/senha |
| `POST` | `/sessions/github` | — | `200` | Login via GitHub OAuth |
| `GET` | `/profile` | ✅ Bearer | `200` | Perfil do usuário autenticado |
| `POST` | `/password/recover` | — | `201` | Solicitar reset de senha |
| `POST` | `/password/reset` | — | `204` | Confirmar reset de senha |

#### `POST /users`
```json
// Body
{ "name": "string", "email": "email", "password": "string (min 6)" }

// 201
{ "userId": "string" }

// 409 — e-mail já cadastrado
{ "message": "User with same email already exists." }
```

#### `POST /sessions/password`
```json
// Body
{ "email": "email", "password": "string" }

// 200
{ "token": "string (JWT)" }

// 400 — credenciais inválidas (user não existe, senha errada, conta OAuth-only)
{ "message": "Invalid credentials." }
```

#### `GET /profile`
```json
// Header: Authorization: Bearer <token>

// 200
{ "id": "string", "name": "string|null", "email": "string", "avatarUrl": "string|null" }

// 401 — token ausente ou inválido
{ "message": "Invalid auth token." }

// 404 — user deletado com JWT ainda válido
{ "message": "User not found." }
```

#### `POST /sessions/github`
```json
// Body
{ "code": "string" }

// 200
{ "token": "string (JWT)" }

// 400 — código OAuth inválido, sem e-mail verificado, OAuth não configurado
{ "message": "string" }
```

#### `POST /password/recover`
```json
// Body
{ "email": "email" }

// 201 — sempre (não vaza existência do e-mail)
{}
```

#### `POST /password/reset`
```json
// Body
{ "code": "uuid", "password": "string (min 6)" }

// 204 — senha atualizada, token deletado

// 400 — token não existe ou tipo errado
{ "message": "Invalid token." }

// 400 — token expirado (> 1h), token deletado
{ "message": "Token expired." }
```

## Error envelope

Todos os erros seguem o formato:
```json
{ "message": "string" }
```

| HTTP | Quando |
|------|--------|
| `400` | Validação de schema Zod, credenciais inválidas, token inválido/expirado |
| `401` | JWT ausente, expirado ou com assinatura inválida |
| `404` | Recurso não encontrado (user deletado com JWT válido) |
| `409` | Conflito (e-mail duplicado) |
| `422` | Erro de validação Fastify (`FST_ERR_VALIDATION`) |
| `500` | Erro não tratado |

## Implementação

Cada rota vive em seu próprio arquivo Fastify plugin (`fastify-plugin`) em
`apps/api/src/http/routes/<grupo>/`. Agrupadas em `index.ts` e registradas em `server.ts`.

```
apps/api/src/http/routes/auth/
├── authenticate-with-github.ts
├── authenticate-with-password.ts
├── create-account.ts
├── get-profile.ts
├── index.ts
├── request-password-recover.ts
└── reset-password.ts

apps/api/src/http/lib/
└── github.ts     # helper getGithubUserData(code)
```

## Related docs

- [auth-flow.md](auth-flow.md) — fluxos detalhados de autenticação
- [../adr/0003-jwt-auth-strategy.md](../adr/0003-jwt-auth-strategy.md) — decisões de JWT e bcrypt
