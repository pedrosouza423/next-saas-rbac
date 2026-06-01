# Architecture — API Routes

**Last updated:** 2026-06-01
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

---

### Organizations — `tags: ['orgs']`

| Method | Path | Auth | Success | ABAC | Descrição |
|--------|------|------|---------|------|-----------|
| `POST` | `/organizations` | ✅ Bearer | `201` | — | Criar organização |
| `GET` | `/organizations` | ✅ Bearer | `200` | — | Listar orgs do usuário |
| `GET` | `/organizations/:slug` | ✅ Bearer | `200` | membro | Detalhe da org |
| `GET` | `/organizations/:slug/membership` | ✅ Bearer | `200` | membro | Membership do usuário atual |
| `PUT` | `/organizations/:slug` | ✅ Bearer | `204` | owner | Atualizar org |
| `DELETE` | `/organizations/:slug` | ✅ Bearer | `204` | ADMIN | Deletar org |
| `PATCH` | `/organizations/:slug/owner` | ✅ Bearer | `204` | owner | Transferir ownership |

#### `POST /organizations`
```json
// Body
{ "name": "string", "domain": "string|null (optional)", "shouldAttachUsersByDomain": "boolean (optional)" }

// 201
{ "organizationId": "string" }

// 409 — slug ou domain já existe
{ "message": "Another organization with the same name (slug) already exists." }
```

#### `GET /organizations`
```json
// 200
{
  "organizations": [
    { "id": "string", "name": "string", "slug": "string", "avatarUrl": "string|null", "role": "ADMIN|MEMBER|BILLING" }
  ]
}
```

#### `GET /organizations/:slug`
```json
// 200
{
  "organization": {
    "id": "string", "name": "string", "slug": "string",
    "domain": "string|null", "shouldAttachUsersByDomain": "boolean",
    "avatarUrl": "string|null", "ownerId": "string",
    "createdAt": "datetime", "updatedAt": "datetime"
  }
}

// 401 — não é membro da org
{ "message": "You are not a member of this organization." }
```

#### `GET /organizations/:slug/membership`
```json
// 200
{ "membership": { "id": "string", "role": "ADMIN|MEMBER|BILLING", "organizationId": "string", "userId": "string" } }
```

#### `PUT /organizations/:slug`
```json
// Body (todos opcionais)
{ "name": "string", "domain": "string|null", "shouldAttachUsersByDomain": "boolean" }

// 204 — atualizado

// 403 — não é owner da org
{ "message": "You are not allowed to update this organization." }

// 409 — domain já pertence a outra org
{ "message": "Another organization with the same domain already exists." }
```

#### `DELETE /organizations/:slug`
```json
// 204 — deletado

// 403 — não é ADMIN
{ "message": "You are not allowed to delete this organization." }
```

#### `PATCH /organizations/:slug/owner`
```json
// Body
{ "transferToUserId": "string" }

// 204 — ownership transferido, novo owner promovido a ADMIN

// 400 — transferindo para si mesmo
{ "message": "You cannot transfer ownership to yourself." }

// 400 — usuário alvo não é membro da org
{ "message": "Target user is not a member of this organization." }

// 403 — não é owner da org
{ "message": "You are not allowed to transfer ownership of this organization." }
```

---

### Projects — `tags: ['projects']`

| Method | Path | Auth | Success | ABAC | Descrição |
|--------|------|------|---------|------|-----------|
| `POST` | `/organizations/:slug/projects` | ✅ Bearer | `201` | MEMBER+ | Criar projeto |
| `GET` | `/organizations/:slug/projects` | ✅ Bearer | `200` | membro | Listar projetos da org |
| `GET` | `/organizations/:slug/projects/:projectSlug` | ✅ Bearer | `200` | membro | Detalhe do projeto |
| `PUT` | `/organizations/:slug/projects/:projectId` | ✅ Bearer | `204` | owner/ADMIN | Atualizar projeto |
| `DELETE` | `/organizations/:slug/projects/:projectId` | ✅ Bearer | `204` | owner/ADMIN | Deletar projeto |

#### `POST /organizations/:slug/projects`
```json
// Body
{ "name": "string", "description": "string", "avatarUrl": "string|null (optional)" }

// 201
{ "projectId": "string" }

// 403 — role BILLING não pode criar projetos
{ "message": "You are not allowed to create projects." }

// 409 — slug já existe
{ "message": "A project with the same name (slug) already exists." }
```

#### `GET /organizations/:slug/projects`
```json
// 200
{
  "projects": [
    {
      "id": "string", "name": "string", "slug": "string",
      "description": "string", "avatarUrl": "string|null",
      "createdAt": "datetime", "updatedAt": "datetime",
      "owner": { "id": "string", "name": "string|null", "avatarUrl": "string|null" }
    }
  ]
}
```

#### `GET /organizations/:slug/projects/:projectSlug`
```json
// 200
{
  "project": {
    "id": "string", "name": "string", "slug": "string",
    "description": "string", "avatarUrl": "string|null",
    "ownerId": "string", "organizationId": "string",
    "createdAt": "datetime", "updatedAt": "datetime"
  }
}

// 404 — projeto não existe na org
{ "message": "Project not found." }
```

#### `PUT /organizations/:slug/projects/:projectId`
```json
// Body (todos opcionais)
{ "name": "string", "description": "string", "avatarUrl": "string|null" }

// 204 — atualizado

// 403 — não é ADMIN nem owner do projeto
{ "message": "You are not allowed to update this project." }

// 404 — projeto não existe na org
{ "message": "Project not found." }
```

#### `DELETE /organizations/:slug/projects/:projectId`
```json
// 204 — deletado

// 403 — não é ADMIN nem owner do projeto
{ "message": "You are not allowed to delete this project." }

// 404 — projeto não existe na org
{ "message": "Project not found." }
```

---

## Error envelope

Todos os erros seguem o formato:
```json
{ "message": "string" }
```

| HTTP | Quando |
|------|--------|
| `400` | Validação de schema Zod, credenciais inválidas, token inválido/expirado |
| `401` | JWT ausente, expirado ou com assinatura inválida; não-membro tentando acessar org |
| `403` | Autenticado mas sem permissão ABAC (ex: não-owner tentando update/delete/transfer) |
| `404` | Recurso não encontrado (user deletado com JWT válido) |
| `409` | Conflito (e-mail duplicado, slug/domain já existe) |
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
