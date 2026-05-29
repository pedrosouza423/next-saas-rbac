# feat/api-auth-routes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implementar as 5 rotas de autenticação por e-mail/senha da API Fastify (cadastro, login, perfil, recuperação e reset de senha) com testes Vitest mockados.

**Architecture:** Cada rota vive em seu próprio arquivo Fastify plugin (`fp`) dentro de `src/http/routes/auth/`. Um `index.ts` agrupa todas e as expõe como um único plugin registrado em `server.ts`. Um novo `ConflictError` (HTTP 409) é adicionado à infraestrutura de erros existente.

**Tech Stack:** Fastify 5, fastify-plugin, fastify-type-provider-zod, Zod v4, bcryptjs, @fastify/jwt, Prisma 7, Vitest 4

---

## File Map

**Criar:**
- `apps/api/src/http/errors/conflict-error.ts`
- `apps/api/src/http/routes/auth/create-account.ts`
- `apps/api/src/http/routes/auth/authenticate-with-password.ts`
- `apps/api/src/http/routes/auth/get-profile.ts`
- `apps/api/src/http/routes/auth/request-password-recover.ts`
- `apps/api/src/http/routes/auth/reset-password.ts`
- `apps/api/src/http/routes/auth/index.ts`
- `apps/api/test/routes/auth/create-account.test.ts`
- `apps/api/test/routes/auth/authenticate-with-password.test.ts`
- `apps/api/test/routes/auth/get-profile.test.ts`
- `apps/api/test/routes/auth/request-password-recover.test.ts`
- `apps/api/test/routes/auth/reset-password.test.ts`

**Modificar:**
- `apps/api/src/http/error-handler.ts` — branch 409 para ConflictError
- `apps/api/test/error-handler.test.ts` — caso de teste 409
- `apps/api/src/server.ts` — registrar authRoutes

---

## Task 1: Branch + ConflictError + error-handler 409

**Files:**
- Create: `apps/api/src/http/errors/conflict-error.ts`
- Modify: `apps/api/src/http/error-handler.ts`
- Modify: `apps/api/test/error-handler.test.ts`

- [ ] **Step 1.1: Criar branch de feature**

```bash
cd apps/api  # ou raiz do monorepo
git checkout -b feat/api-auth-routes
```

- [ ] **Step 1.2: Criar `conflict-error.ts`**

Criar `apps/api/src/http/errors/conflict-error.ts`:

```ts
export class ConflictError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ConflictError'
    Object.setPrototypeOf(this, new.target.prototype)
  }
}
```

- [ ] **Step 1.3: Adicionar branch 409 no error handler**

Em `apps/api/src/http/error-handler.ts`, adicionar o import e o branch **antes** do bloco `console.error`:

```ts
import type { FastifyError, FastifyInstance } from 'fastify'
import { hasZodFastifySchemaValidationErrors } from 'fastify-type-provider-zod'

import { BadRequestError } from './errors/bad-request-error.js'
import { ConflictError } from './errors/conflict-error.js'
import { NotFoundError } from './errors/not-found-error.js'
import { UnauthorizedError } from './errors/unauthorized-error.js'

export function errorHandler(app: FastifyInstance) {
  app.setErrorHandler((error: FastifyError, _request, reply) => {
    if (hasZodFastifySchemaValidationErrors(error)) {
      return reply.status(400).send({
        message: 'Validation error.',
        errors: error.validation,
      })
    }

    if (error.code === 'FST_ERR_VALIDATION') {
      return reply.status(400).send({ message: 'Validation error.' })
    }

    if (error instanceof BadRequestError) {
      return reply.status(400).send({ message: error.message })
    }

    if (error instanceof UnauthorizedError) {
      return reply.status(401).send({ message: error.message })
    }

    if (error instanceof NotFoundError) {
      return reply.status(404).send({ message: error.message })
    }

    if (error instanceof ConflictError) {
      return reply.status(409).send({ message: error.message })
    }

    console.error(error)

    return reply.status(500).send({ message: 'Internal server error.' })
  })
}
```

- [ ] **Step 1.4: Adicionar teste para ConflictError em `error-handler.test.ts`**

Em `apps/api/test/error-handler.test.ts`, adicionar os imports e o novo caso. O arquivo completo fica:

```ts
import { describe, expect, it, vi } from 'vitest'
import { z } from 'zod/v4'

import { BadRequestError } from '../src/http/errors/bad-request-error.js'
import { ConflictError } from '../src/http/errors/conflict-error.js'
import { NotFoundError } from '../src/http/errors/not-found-error.js'
import { UnauthorizedError } from '../src/http/errors/unauthorized-error.js'
import { createTestApp } from './create-test-app.js'

vi.mock('../src/lib/prisma.js', () => ({
  prisma: {
    member: {
      findFirst: vi.fn(),
    },
  },
}))

describe('Error Handler', () => {
  it('returns 400 with validation errors for invalid Zod schema', async () => {
    const app = await createTestApp()

    app.get('/test-zod', {
      schema: {
        querystring: z.object({ name: z.string() }),
      },
      handler: async () => ({ ok: true }),
    })

    await app.ready()

    const response = await app.inject({
      method: 'GET',
      url: '/test-zod',
    })

    expect(response.statusCode).toBe(400)
    const body = response.json()
    expect(body.message).toBe('Validation error.')
    expect(body.errors).toBeUndefined()
  })

  it('returns 400 for BadRequestError', async () => {
    const app = await createTestApp()

    app.get('/test-bad-request', {
      handler: async () => {
        throw new BadRequestError('bad input')
      },
    })

    await app.ready()

    const response = await app.inject({
      method: 'GET',
      url: '/test-bad-request',
    })

    expect(response.statusCode).toBe(400)
    expect(response.json().message).toBe('bad input')
  })

  it('returns 401 for UnauthorizedError', async () => {
    const app = await createTestApp()

    app.get('/test-unauthorized', {
      handler: async () => {
        throw new UnauthorizedError()
      },
    })

    await app.ready()

    const response = await app.inject({
      method: 'GET',
      url: '/test-unauthorized',
    })

    expect(response.statusCode).toBe(401)
    expect(response.json().message).toBe('Unauthorized')
  })

  it('returns 404 for NotFoundError', async () => {
    const app = await createTestApp()

    app.get('/test-not-found', {
      handler: async () => {
        throw new NotFoundError('resource not found')
      },
    })

    await app.ready()

    const response = await app.inject({
      method: 'GET',
      url: '/test-not-found',
    })

    expect(response.statusCode).toBe(404)
    expect(response.json().message).toBe('resource not found')
  })

  it('returns 409 for ConflictError', async () => {
    const app = await createTestApp()

    app.get('/test-conflict', {
      handler: async () => {
        throw new ConflictError('resource already exists')
      },
    })

    await app.ready()

    const response = await app.inject({
      method: 'GET',
      url: '/test-conflict',
    })

    expect(response.statusCode).toBe(409)
    expect(response.json().message).toBe('resource already exists')
  })

  it('returns 500 for unhandled errors', async () => {
    const app = await createTestApp()

    app.get('/test-unknown', {
      handler: async () => {
        throw new Error('something exploded')
      },
    })

    await app.ready()

    const response = await app.inject({
      method: 'GET',
      url: '/test-unknown',
    })

    expect(response.statusCode).toBe(500)
    expect(response.json().message).toBe('Internal server error.')
  })
})
```

- [ ] **Step 1.5: Rodar os testes e confirmar que todos passam**

```bash
pnpm --filter=api test
```

Esperado: todos os testes passam (incluindo o novo caso 409).

- [ ] **Step 1.6: Commit**

```bash
git add apps/api/src/http/errors/conflict-error.ts \
        apps/api/src/http/error-handler.ts \
        apps/api/test/error-handler.test.ts
git commit -m "feat(api): add ConflictError and 409 branch to error handler"
```

---

## Task 2: POST /users — criar conta

**Files:**
- Create: `apps/api/src/http/routes/auth/create-account.ts`
- Create: `apps/api/test/routes/auth/create-account.test.ts`

- [ ] **Step 2.1: Escrever o teste e stub do handler**

Criar `apps/api/test/routes/auth/create-account.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { createTestApp } from '../../create-test-app.js'
import { createAccountRoute } from '../../../src/http/routes/auth/create-account.js'

vi.mock('../../../src/lib/prisma.js', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
    organization: {
      findFirst: vi.fn(),
    },
    member: {
      create: vi.fn(),
    },
  },
}))

describe('POST /users', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('creates account and returns 201 with userId', async () => {
    const { prisma } = await import('../../../src/lib/prisma.js')

    vi.mocked(prisma.user.findUnique).mockResolvedValue(null)
    vi.mocked(prisma.user.create).mockResolvedValue({
      id: 'user-1',
      name: 'Pedro',
      email: 'pedro@example.com',
      passwordHash: 'hashed',
      avatarUrl: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    vi.mocked(prisma.organization.findFirst).mockResolvedValue(null)

    const app = await createTestApp()
    app.register(createAccountRoute)
    await app.ready()

    const response = await app.inject({
      method: 'POST',
      url: '/users',
      payload: { name: 'Pedro', email: 'pedro@example.com', password: 'secret123' },
    })

    expect(response.statusCode).toBe(201)
    expect(response.json().userId).toBe('user-1')
  })

  it('returns 409 when email already exists', async () => {
    const { prisma } = await import('../../../src/lib/prisma.js')

    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: 'existing',
      name: 'Other',
      email: 'pedro@example.com',
      passwordHash: 'hash',
      avatarUrl: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    const app = await createTestApp()
    app.register(createAccountRoute)
    await app.ready()

    const response = await app.inject({
      method: 'POST',
      url: '/users',
      payload: { name: 'Pedro', email: 'pedro@example.com', password: 'secret123' },
    })

    expect(response.statusCode).toBe(409)
    expect(response.json().message).toBe('User with same email already exists.')
  })

  it('creates Member when organization with matching domain exists', async () => {
    const { prisma } = await import('../../../src/lib/prisma.js')

    vi.mocked(prisma.user.findUnique).mockResolvedValue(null)
    vi.mocked(prisma.user.create).mockResolvedValue({
      id: 'user-1',
      name: 'Pedro',
      email: 'pedro@acme.com',
      passwordHash: 'hashed',
      avatarUrl: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    vi.mocked(prisma.organization.findFirst).mockResolvedValue({
      id: 'org-1',
      name: 'Acme',
      slug: 'acme',
      domain: 'acme.com',
      shouldAttachUsersByDomain: true,
      avatarUrl: null,
      ownerId: 'owner-1',
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    vi.mocked(prisma.member.create).mockResolvedValue({
      id: 'member-1',
      role: 'MEMBER',
      userId: 'user-1',
      organizationId: 'org-1',
    })

    const app = await createTestApp()
    app.register(createAccountRoute)
    await app.ready()

    const response = await app.inject({
      method: 'POST',
      url: '/users',
      payload: { name: 'Pedro', email: 'pedro@acme.com', password: 'secret123' },
    })

    expect(response.statusCode).toBe(201)
    expect(prisma.member.create).toHaveBeenCalledWith({
      data: { userId: 'user-1', organizationId: 'org-1', role: 'MEMBER' },
    })
  })
})
```

Criar o stub `apps/api/src/http/routes/auth/create-account.ts`:

```ts
import type { FastifyInstance } from 'fastify'
import fp from 'fastify-plugin'

export const createAccountRoute = fp(async (_app: FastifyInstance) => {})
```

- [ ] **Step 2.2: Rodar para confirmar que os testes falham**

```bash
pnpm --filter=api test -- test/routes/auth/create-account.test.ts
```

Esperado: 3 testes FAIL (`statusCode` esperado 201/409 mas recebido 404, pois a rota não existe).

- [ ] **Step 2.3: Implementar o handler completo**

Substituir o conteúdo de `apps/api/src/http/routes/auth/create-account.ts`:

```ts
import bcrypt from 'bcryptjs'
import type { FastifyInstance } from 'fastify'
import fp from 'fastify-plugin'
import { z } from 'zod/v4'

import { ConflictError } from '../../errors/conflict-error.js'
import { prisma } from '../../../lib/prisma.js'

export const createAccountRoute = fp(async (app: FastifyInstance) => {
  app.post(
    '/users',
    {
      schema: {
        tags: ['auth'],
        summary: 'Create a new account',
        body: z.object({
          name: z.string(),
          email: z.email(),
          password: z.string().min(6),
        }),
        response: {
          201: z.object({ userId: z.string() }),
        },
      },
    },
    async (request, reply) => {
      const { name, email, password } = request.body

      const existingUser = await prisma.user.findUnique({ where: { email } })
      if (existingUser) {
        throw new ConflictError('User with same email already exists.')
      }

      const passwordHash = await bcrypt.hash(password, 6)
      const user = await prisma.user.create({
        data: { name, email, passwordHash },
      })

      const emailDomain = email.split('@').at(1)
      if (emailDomain) {
        const org = await prisma.organization.findFirst({
          where: { shouldAttachUsersByDomain: true, domain: emailDomain },
        })

        if (org) {
          await prisma.member.create({
            data: { userId: user.id, organizationId: org.id, role: 'MEMBER' },
          })
        }
      }

      return reply.status(201).send({ userId: user.id })
    },
  )
})
```

- [ ] **Step 2.4: Rodar para confirmar que os testes passam**

```bash
pnpm --filter=api test -- test/routes/auth/create-account.test.ts
```

Esperado: 3 testes PASS.

- [ ] **Step 2.5: Commit**

```bash
git add apps/api/src/http/routes/auth/create-account.ts \
        apps/api/test/routes/auth/create-account.test.ts
git commit -m "feat(api): add POST /users route with auto-attach by domain"
```

---

## Task 3: POST /sessions/password — login

**Files:**
- Create: `apps/api/src/http/routes/auth/authenticate-with-password.ts`
- Create: `apps/api/test/routes/auth/authenticate-with-password.test.ts`

- [ ] **Step 3.1: Escrever o teste e stub**

Criar `apps/api/test/routes/auth/authenticate-with-password.test.ts`:

```ts
import bcrypt from 'bcryptjs'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { createTestApp } from '../../create-test-app.js'
import { authenticateWithPasswordRoute } from '../../../src/http/routes/auth/authenticate-with-password.js'

vi.mock('../../../src/lib/prisma.js', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
  },
}))

describe('POST /sessions/password', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 200 with token on valid credentials', async () => {
    const { prisma } = await import('../../../src/lib/prisma.js')
    const hash = await bcrypt.hash('secret123', 6)

    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: 'user-1',
      name: 'Pedro',
      email: 'pedro@example.com',
      passwordHash: hash,
      avatarUrl: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    const app = await createTestApp()
    app.register(authenticateWithPasswordRoute)
    await app.ready()

    const response = await app.inject({
      method: 'POST',
      url: '/sessions/password',
      payload: { email: 'pedro@example.com', password: 'secret123' },
    })

    expect(response.statusCode).toBe(200)
    expect(typeof response.json().token).toBe('string')
  })

  it('returns 400 when user does not exist', async () => {
    const { prisma } = await import('../../../src/lib/prisma.js')
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null)

    const app = await createTestApp()
    app.register(authenticateWithPasswordRoute)
    await app.ready()

    const response = await app.inject({
      method: 'POST',
      url: '/sessions/password',
      payload: { email: 'nobody@example.com', password: 'secret123' },
    })

    expect(response.statusCode).toBe(400)
    expect(response.json().message).toBe('Invalid credentials.')
  })

  it('returns 400 when password is wrong', async () => {
    const { prisma } = await import('../../../src/lib/prisma.js')
    const hash = await bcrypt.hash('correct', 6)

    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: 'user-1',
      name: 'Pedro',
      email: 'pedro@example.com',
      passwordHash: hash,
      avatarUrl: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    const app = await createTestApp()
    app.register(authenticateWithPasswordRoute)
    await app.ready()

    const response = await app.inject({
      method: 'POST',
      url: '/sessions/password',
      payload: { email: 'pedro@example.com', password: 'wrong' },
    })

    expect(response.statusCode).toBe(400)
    expect(response.json().message).toBe('Invalid credentials.')
  })

  it('returns 400 when account has no password (OAuth-only)', async () => {
    const { prisma } = await import('../../../src/lib/prisma.js')

    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: 'user-1',
      name: 'Pedro',
      email: 'pedro@example.com',
      passwordHash: null,
      avatarUrl: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    const app = await createTestApp()
    app.register(authenticateWithPasswordRoute)
    await app.ready()

    const response = await app.inject({
      method: 'POST',
      url: '/sessions/password',
      payload: { email: 'pedro@example.com', password: 'any' },
    })

    expect(response.statusCode).toBe(400)
    expect(response.json().message).toBe('Invalid credentials.')
  })
})
```

Criar o stub `apps/api/src/http/routes/auth/authenticate-with-password.ts`:

```ts
import type { FastifyInstance } from 'fastify'
import fp from 'fastify-plugin'

export const authenticateWithPasswordRoute = fp(async (_app: FastifyInstance) => {})
```

- [ ] **Step 3.2: Rodar para confirmar que os testes falham**

```bash
pnpm --filter=api test -- test/routes/auth/authenticate-with-password.test.ts
```

Esperado: 4 testes FAIL.

- [ ] **Step 3.3: Implementar o handler completo**

Substituir `apps/api/src/http/routes/auth/authenticate-with-password.ts`:

```ts
import bcrypt from 'bcryptjs'
import type { FastifyInstance } from 'fastify'
import fp from 'fastify-plugin'
import { z } from 'zod/v4'

import { BadRequestError } from '../../errors/bad-request-error.js'
import { prisma } from '../../../lib/prisma.js'

export const authenticateWithPasswordRoute = fp(async (app: FastifyInstance) => {
  app.post(
    '/sessions/password',
    {
      schema: {
        tags: ['auth'],
        summary: 'Authenticate with email and password',
        body: z.object({
          email: z.email(),
          password: z.string(),
        }),
        response: {
          200: z.object({ token: z.string() }),
        },
      },
    },
    async (request, reply) => {
      const { email, password } = request.body

      const user = await prisma.user.findUnique({ where: { email } })

      if (!user || !user.passwordHash) {
        throw new BadRequestError('Invalid credentials.')
      }

      const valid = await bcrypt.compare(password, user.passwordHash)
      if (!valid) {
        throw new BadRequestError('Invalid credentials.')
      }

      const token = app.jwt.sign({ sub: user.id }, { expiresIn: '7d' })

      return reply.status(200).send({ token })
    },
  )
})
```

- [ ] **Step 3.4: Rodar para confirmar que os testes passam**

```bash
pnpm --filter=api test -- test/routes/auth/authenticate-with-password.test.ts
```

Esperado: 4 testes PASS.

- [ ] **Step 3.5: Commit**

```bash
git add apps/api/src/http/routes/auth/authenticate-with-password.ts \
        apps/api/test/routes/auth/authenticate-with-password.test.ts
git commit -m "feat(api): add POST /sessions/password route"
```

---

## Task 4: GET /profile — perfil autenticado

**Files:**
- Create: `apps/api/src/http/routes/auth/get-profile.ts`
- Create: `apps/api/test/routes/auth/get-profile.test.ts`

- [ ] **Step 4.1: Escrever o teste e stub**

Criar `apps/api/test/routes/auth/get-profile.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { createTestApp } from '../../create-test-app.js'
import { getProfileRoute } from '../../../src/http/routes/auth/get-profile.js'

vi.mock('../../../src/lib/prisma.js', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
    member: {
      findFirst: vi.fn(),
    },
  },
}))

describe('GET /profile', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns user profile when authenticated', async () => {
    const { prisma } = await import('../../../src/lib/prisma.js')

    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: 'user-1',
      name: 'Pedro',
      email: 'pedro@example.com',
      passwordHash: 'hash',
      avatarUrl: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    const app = await createTestApp()
    app.register(getProfileRoute)
    await app.ready()

    const token = app.jwt.sign({ sub: 'user-1' })

    const response = await app.inject({
      method: 'GET',
      url: '/profile',
      headers: { authorization: `Bearer ${token}` },
    })

    expect(response.statusCode).toBe(200)
    expect(response.json()).toMatchObject({
      id: 'user-1',
      name: 'Pedro',
      email: 'pedro@example.com',
      avatarUrl: null,
    })
  })

  it('returns 401 when no token provided', async () => {
    const app = await createTestApp()
    app.register(getProfileRoute)
    await app.ready()

    const response = await app.inject({
      method: 'GET',
      url: '/profile',
    })

    expect(response.statusCode).toBe(401)
    expect(response.json().message).toBe('Invalid auth token.')
  })
})
```

Criar o stub `apps/api/src/http/routes/auth/get-profile.ts`:

```ts
import type { FastifyInstance } from 'fastify'
import fp from 'fastify-plugin'

export const getProfileRoute = fp(async (_app: FastifyInstance) => {})
```

- [ ] **Step 4.2: Rodar para confirmar que os testes falham**

```bash
pnpm --filter=api test -- test/routes/auth/get-profile.test.ts
```

Esperado: 2 testes FAIL.

- [ ] **Step 4.3: Implementar o handler completo**

Substituir `apps/api/src/http/routes/auth/get-profile.ts`:

```ts
import type { FastifyInstance } from 'fastify'
import fp from 'fastify-plugin'
import { z } from 'zod/v4'

import { BadRequestError } from '../../errors/bad-request-error.js'
import { prisma } from '../../../lib/prisma.js'

export const getProfileRoute = fp(async (app: FastifyInstance) => {
  app.get(
    '/profile',
    {
      schema: {
        tags: ['auth'],
        summary: 'Get authenticated user profile',
        response: {
          200: z.object({
            id: z.string(),
            name: z.string().nullable(),
            email: z.string(),
            avatarUrl: z.string().nullable(),
          }),
        },
      },
    },
    async (request, reply) => {
      const userId = await request.getCurrentUserId()

      const user = await prisma.user.findUnique({ where: { id: userId } })
      if (!user) {
        throw new BadRequestError('User not found.')
      }

      return reply.status(200).send({
        id: user.id,
        name: user.name,
        email: user.email,
        avatarUrl: user.avatarUrl,
      })
    },
  )
})
```

- [ ] **Step 4.4: Rodar para confirmar que os testes passam**

```bash
pnpm --filter=api test -- test/routes/auth/get-profile.test.ts
```

Esperado: 2 testes PASS.

- [ ] **Step 4.5: Commit**

```bash
git add apps/api/src/http/routes/auth/get-profile.ts \
        apps/api/test/routes/auth/get-profile.test.ts
git commit -m "feat(api): add GET /profile route"
```

---

## Task 5: POST /password/recover — solicitar reset de senha

**Files:**
- Create: `apps/api/src/http/routes/auth/request-password-recover.ts`
- Create: `apps/api/test/routes/auth/request-password-recover.test.ts`

- [ ] **Step 5.1: Escrever o teste e stub**

Criar `apps/api/test/routes/auth/request-password-recover.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { createTestApp } from '../../create-test-app.js'
import { requestPasswordRecoverRoute } from '../../../src/http/routes/auth/request-password-recover.js'

vi.mock('../../../src/lib/prisma.js', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
    token: {
      create: vi.fn(),
    },
    member: {
      findFirst: vi.fn(),
    },
  },
}))

describe('POST /password/recover', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 201 and creates token when user exists', async () => {
    const { prisma } = await import('../../../src/lib/prisma.js')

    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: 'user-1',
      name: 'Pedro',
      email: 'pedro@example.com',
      passwordHash: 'hash',
      avatarUrl: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    vi.mocked(prisma.token.create).mockResolvedValue({
      id: 'token-uuid-1',
      type: 'PASSWORD_RECOVER',
      userId: 'user-1',
      createdAt: new Date(),
    })

    const app = await createTestApp()
    app.register(requestPasswordRecoverRoute)
    await app.ready()

    const response = await app.inject({
      method: 'POST',
      url: '/password/recover',
      payload: { email: 'pedro@example.com' },
    })

    expect(response.statusCode).toBe(201)
    expect(prisma.token.create).toHaveBeenCalledWith({
      data: { type: 'PASSWORD_RECOVER', userId: 'user-1' },
    })
  })

  it('returns 201 without creating token when user does not exist', async () => {
    const { prisma } = await import('../../../src/lib/prisma.js')

    vi.mocked(prisma.user.findUnique).mockResolvedValue(null)

    const app = await createTestApp()
    app.register(requestPasswordRecoverRoute)
    await app.ready()

    const response = await app.inject({
      method: 'POST',
      url: '/password/recover',
      payload: { email: 'nobody@example.com' },
    })

    expect(response.statusCode).toBe(201)
    expect(prisma.token.create).not.toHaveBeenCalled()
  })
})
```

Criar o stub `apps/api/src/http/routes/auth/request-password-recover.ts`:

```ts
import type { FastifyInstance } from 'fastify'
import fp from 'fastify-plugin'

export const requestPasswordRecoverRoute = fp(async (_app: FastifyInstance) => {})
```

- [ ] **Step 5.2: Rodar para confirmar que os testes falham**

```bash
pnpm --filter=api test -- test/routes/auth/request-password-recover.test.ts
```

Esperado: 2 testes FAIL.

- [ ] **Step 5.3: Implementar o handler completo**

Substituir `apps/api/src/http/routes/auth/request-password-recover.ts`:

```ts
import type { FastifyInstance } from 'fastify'
import fp from 'fastify-plugin'
import { z } from 'zod/v4'

import { prisma } from '../../../lib/prisma.js'

export const requestPasswordRecoverRoute = fp(async (app: FastifyInstance) => {
  app.post(
    '/password/recover',
    {
      schema: {
        tags: ['auth'],
        summary: 'Request password recovery token',
        body: z.object({ email: z.email() }),
        response: { 201: z.object({}) },
      },
    },
    async (request, reply) => {
      const { email } = request.body

      const user = await prisma.user.findUnique({ where: { email } })

      if (user) {
        const token = await prisma.token.create({
          data: { type: 'PASSWORD_RECOVER', userId: user.id },
        })
        console.log('Password recover token:', token.id)
      }

      return reply.status(201).send({})
    },
  )
})
```

- [ ] **Step 5.4: Rodar para confirmar que os testes passam**

```bash
pnpm --filter=api test -- test/routes/auth/request-password-recover.test.ts
```

Esperado: 2 testes PASS.

- [ ] **Step 5.5: Commit**

```bash
git add apps/api/src/http/routes/auth/request-password-recover.ts \
        apps/api/test/routes/auth/request-password-recover.test.ts
git commit -m "feat(api): add POST /password/recover route"
```

---

## Task 6: POST /password/reset — confirmar reset de senha

**Files:**
- Create: `apps/api/src/http/routes/auth/reset-password.ts`
- Create: `apps/api/test/routes/auth/reset-password.test.ts`

- [ ] **Step 6.1: Escrever o teste e stub**

Criar `apps/api/test/routes/auth/reset-password.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { createTestApp } from '../../create-test-app.js'
import { resetPasswordRoute } from '../../../src/http/routes/auth/reset-password.js'

vi.mock('../../../src/lib/prisma.js', () => ({
  prisma: {
    token: {
      findUnique: vi.fn(),
      delete: vi.fn(),
    },
    user: {
      update: vi.fn(),
    },
    $transaction: vi.fn(),
    member: {
      findFirst: vi.fn(),
    },
  },
}))

describe('POST /password/reset', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 204 on valid token', async () => {
    const { prisma } = await import('../../../src/lib/prisma.js')

    vi.mocked(prisma.token.findUnique).mockResolvedValue({
      id: 'token-uuid-1',
      type: 'PASSWORD_RECOVER',
      userId: 'user-1',
      createdAt: new Date(),
    })

    const app = await createTestApp()
    app.register(resetPasswordRoute)
    await app.ready()

    const response = await app.inject({
      method: 'POST',
      url: '/password/reset',
      payload: { code: 'f47ac10b-58cc-4372-a567-0e02b2c3d479', password: 'newpassword' },
    })

    expect(response.statusCode).toBe(204)
    expect(prisma.$transaction).toHaveBeenCalled()
  })

  it('returns 400 when token does not exist', async () => {
    const { prisma } = await import('../../../src/lib/prisma.js')

    vi.mocked(prisma.token.findUnique).mockResolvedValue(null)

    const app = await createTestApp()
    app.register(resetPasswordRoute)
    await app.ready()

    const response = await app.inject({
      method: 'POST',
      url: '/password/reset',
      payload: { code: 'f47ac10b-58cc-4372-a567-0e02b2c3d479', password: 'newpassword' },
    })

    expect(response.statusCode).toBe(400)
    expect(response.json().message).toBe('Invalid token.')
  })

  it('returns 400 when token is older than 1 hour', async () => {
    const { prisma } = await import('../../../src/lib/prisma.js')

    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000)
    vi.mocked(prisma.token.findUnique).mockResolvedValue({
      id: 'token-uuid-1',
      type: 'PASSWORD_RECOVER',
      userId: 'user-1',
      createdAt: twoHoursAgo,
    })

    const app = await createTestApp()
    app.register(resetPasswordRoute)
    await app.ready()

    const response = await app.inject({
      method: 'POST',
      url: '/password/reset',
      payload: { code: 'f47ac10b-58cc-4372-a567-0e02b2c3d479', password: 'newpassword' },
    })

    expect(response.statusCode).toBe(400)
    expect(response.json().message).toBe('Token expired.')
  })
})
```

Criar o stub `apps/api/src/http/routes/auth/reset-password.ts`:

```ts
import type { FastifyInstance } from 'fastify'
import fp from 'fastify-plugin'

export const resetPasswordRoute = fp(async (_app: FastifyInstance) => {})
```

- [ ] **Step 6.2: Rodar para confirmar que os testes falham**

```bash
pnpm --filter=api test -- test/routes/auth/reset-password.test.ts
```

Esperado: 3 testes FAIL.

- [ ] **Step 6.3: Implementar o handler completo**

Substituir `apps/api/src/http/routes/auth/reset-password.ts`:

```ts
import bcrypt from 'bcryptjs'
import type { FastifyInstance } from 'fastify'
import fp from 'fastify-plugin'
import { z } from 'zod/v4'

import { BadRequestError } from '../../errors/bad-request-error.js'
import { prisma } from '../../../lib/prisma.js'

export const resetPasswordRoute = fp(async (app: FastifyInstance) => {
  app.post(
    '/password/reset',
    {
      schema: {
        tags: ['auth'],
        summary: 'Reset password using recovery token',
        body: z.object({
          code: z.string().uuid(),
          password: z.string().min(6),
        }),
        response: { 204: z.object({}) },
      },
    },
    async (request, reply) => {
      const { code, password } = request.body

      const token = await prisma.token.findUnique({ where: { id: code } })

      if (!token) {
        throw new BadRequestError('Invalid token.')
      }

      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)
      if (token.createdAt < oneHourAgo) {
        throw new BadRequestError('Token expired.')
      }

      const passwordHash = await bcrypt.hash(password, 6)

      await prisma.$transaction([
        prisma.user.update({
          where: { id: token.userId },
          data: { passwordHash },
        }),
        prisma.token.delete({ where: { id: token.id } }),
      ])

      return reply.status(204).send({})
    },
  )
})
```

- [ ] **Step 6.4: Rodar para confirmar que os testes passam**

```bash
pnpm --filter=api test -- test/routes/auth/reset-password.test.ts
```

Esperado: 3 testes PASS.

- [ ] **Step 6.5: Commit**

```bash
git add apps/api/src/http/routes/auth/reset-password.ts \
        apps/api/test/routes/auth/reset-password.test.ts
git commit -m "feat(api): add POST /password/reset route"
```

---

## Task 7: Registro do grupo + server.ts + verificação final

**Files:**
- Create: `apps/api/src/http/routes/auth/index.ts`
- Modify: `apps/api/src/server.ts`

- [ ] **Step 7.1: Criar `routes/auth/index.ts`**

Criar `apps/api/src/http/routes/auth/index.ts`:

```ts
import fp from 'fastify-plugin'

import { authenticateWithPasswordRoute } from './authenticate-with-password.js'
import { createAccountRoute } from './create-account.js'
import { getProfileRoute } from './get-profile.js'
import { requestPasswordRecoverRoute } from './request-password-recover.js'
import { resetPasswordRoute } from './reset-password.js'

export const authRoutes = fp(async (app) => {
  app.register(createAccountRoute)
  app.register(authenticateWithPasswordRoute)
  app.register(getProfileRoute)
  app.register(requestPasswordRecoverRoute)
  app.register(resetPasswordRoute)
})
```

- [ ] **Step 7.2: Registrar `authRoutes` em `server.ts`**

Substituir o conteúdo de `apps/api/src/server.ts`:

```ts
import fastifyCors from '@fastify/cors'
import fastifySwagger from '@fastify/swagger'
import fastifySwaggerUi from '@fastify/swagger-ui'
import fastify from 'fastify'
import {
  jsonSchemaTransform,
  serializerCompiler,
  validatorCompiler,
  type ZodTypeProvider,
} from 'fastify-type-provider-zod'
import { z } from 'zod/v4'

import { env } from './env.js'
import { errorHandler } from './http/error-handler.js'
import { auth } from './http/middlewares/auth.js'
import { authRoutes } from './http/routes/auth/index.js'
import { prisma } from './lib/prisma.js'

const app = fastify({ logger: true }).withTypeProvider<ZodTypeProvider>()

app.setValidatorCompiler(validatorCompiler)
app.setSerializerCompiler(serializerCompiler)
errorHandler(app)

await app.register(fastifySwagger, {
  openapi: {
    info: {
      title: 'Next.js SaaS + RBAC',
      description: 'REST API for Next.js SaaS with RBAC',
      version: '1.0.0',
    },
  },
  transform: jsonSchemaTransform,
})

await app.register(fastifySwaggerUi, {
  routePrefix: '/docs',
})

await app.register(auth)
await app.register(authRoutes)

await app.register(fastifyCors, { origin: true })

app.route({
  method: 'GET',
  url: '/health',
  schema: {
    response: {
      200: z.object({ status: z.literal('ok'), db: z.literal('ok') }),
    },
  },
  handler: async () => {
    await prisma.$queryRaw`SELECT 1`
    return { status: 'ok' as const, db: 'ok' as const }
  },
})

await app.listen({ port: env.PORT, host: '0.0.0.0' })
console.log(`HTTP server running on http://localhost:${env.PORT}`)
```

- [ ] **Step 7.3: Rodar todos os testes**

```bash
pnpm --filter=api test
```

Esperado: todos os testes PASS (incluindo os testes de infraestrutura do PR #20 e os 14 novos testes das rotas).

- [ ] **Step 7.4: Rodar lint e type check**

```bash
pnpm --filter=api lint
pnpm --filter=api check-types
```

Esperado: 0 warnings, 0 errors.

- [ ] **Step 7.5: Commit final**

```bash
git add apps/api/src/http/routes/auth/index.ts \
        apps/api/src/server.ts
git commit -m "feat(api): wire auth routes group into server"
```

---

## Verificação smoke manual (opcional, requer Docker rodando)

```bash
# Terminal 1 — subir o banco e a API
docker-compose up -d
pnpm --filter=api dev

# Terminal 2 — smoke test sequencial
# 1. Criar conta
curl -s -X POST http://localhost:3333/users \
  -H 'Content-Type: application/json' \
  -d '{"name":"Pedro","email":"pedro@test.com","password":"secret123"}' | jq

# 2. Login
TOKEN=$(curl -s -X POST http://localhost:3333/sessions/password \
  -H 'Content-Type: application/json' \
  -d '{"email":"pedro@test.com","password":"secret123"}' | jq -r '.token')
echo "Token: $TOKEN"

# 3. Perfil
curl -s http://localhost:3333/profile \
  -H "Authorization: Bearer $TOKEN" | jq

# 4. Swagger UI
open http://localhost:3333/docs
```

---

## Spec de referência

[docs/specs/2026-05-29-api-auth-routes.md](../specs/2026-05-29-api-auth-routes.md)
