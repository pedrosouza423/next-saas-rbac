import { beforeEach, describe, expect, it, vi } from 'vitest'

import { getInvitesRoute } from '../../../src/http/routes/invites/get-invites.js'
import { createTestApp } from '../../create-test-app.js'

vi.mock('../../../src/lib/prisma.js', () => ({
  prisma: {
    member: { findFirst: vi.fn() },
    invite: { findMany: vi.fn() },
  },
}))

function makeMember(role: 'ADMIN' | 'MEMBER' | 'BILLING', userId: string) {
  return {
    id: 'member-1',
    role,
    userId,
    organizationId: 'org-1',
    organization: {
      id: 'org-1',
      name: 'Acme Corp',
      slug: 'acme-corp',
      domain: null,
      shouldAttachUsersByDomain: false,
      avatarUrl: null,
      ownerId: 'owner-1',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  }
}

const stubInvites = [
  {
    id: 'invite-1',
    email: 'a@example.com',
    role: 'MEMBER',
    createdAt: new Date(),
    author: { id: 'user-1', name: 'Alice', avatarUrl: null },
  },
]

describe('GET /organizations/:slug/invites', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('ADMIN can list invites — returns 200', async () => {
    const { prisma } = await import('../../../src/lib/prisma.js')

    vi.mocked(prisma.member.findFirst).mockResolvedValue(
      makeMember('ADMIN', 'user-1'),
    )
    vi.mocked(prisma.invite.findMany).mockResolvedValue(stubInvites as never)

    const app = await createTestApp()
    app.register(getInvitesRoute)
    await app.ready()

    const token = app.jwt.sign({ sub: 'user-1' })

    const response = await app.inject({
      method: 'GET',
      url: '/organizations/acme-corp/invites',
      headers: { authorization: `Bearer ${token}` },
    })

    expect(response.statusCode).toBe(200)
    expect(response.json().invites).toHaveLength(1)
  })

  it('MEMBER cannot list invites — returns 403', async () => {
    const { prisma } = await import('../../../src/lib/prisma.js')

    vi.mocked(prisma.member.findFirst).mockResolvedValue(
      makeMember('MEMBER', 'user-2'),
    )

    const app = await createTestApp()
    app.register(getInvitesRoute)
    await app.ready()

    const token = app.jwt.sign({ sub: 'user-2' })

    const response = await app.inject({
      method: 'GET',
      url: '/organizations/acme-corp/invites',
      headers: { authorization: `Bearer ${token}` },
    })

    expect(response.statusCode).toBe(403)
  })

  it('BILLING cannot list invites — returns 403', async () => {
    const { prisma } = await import('../../../src/lib/prisma.js')

    vi.mocked(prisma.member.findFirst).mockResolvedValue(
      makeMember('BILLING', 'user-3'),
    )

    const app = await createTestApp()
    app.register(getInvitesRoute)
    await app.ready()

    const token = app.jwt.sign({ sub: 'user-3' })

    const response = await app.inject({
      method: 'GET',
      url: '/organizations/acme-corp/invites',
      headers: { authorization: `Bearer ${token}` },
    })

    expect(response.statusCode).toBe(403)
  })

  it('returns 401 without token', async () => {
    const app = await createTestApp()
    app.register(getInvitesRoute)
    await app.ready()

    const response = await app.inject({
      method: 'GET',
      url: '/organizations/acme-corp/invites',
    })

    expect(response.statusCode).toBe(401)
  })
})
