import { beforeEach, describe, expect, it, vi } from 'vitest'

import { createAccountRoute } from '../../../src/http/routes/auth/create-account.js'
import { createTestApp } from '../../create-test-app.js'

vi.mock('../../../src/lib/prisma.js', () => {
  const user = { findUnique: vi.fn(), create: vi.fn() }
  const organization = { findFirst: vi.fn() }
  const member = { create: vi.fn() }
  const $transaction = vi.fn((fn: (tx: unknown) => Promise<unknown>) =>
    fn({ user, organization, member }),
  )
  return { prisma: { user, organization, member, $transaction } }
})

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
