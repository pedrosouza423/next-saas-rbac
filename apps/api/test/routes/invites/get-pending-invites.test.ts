import { beforeEach, describe, expect, it, vi } from 'vitest'

import { getPendingInvitesRoute } from '../../../src/http/routes/invites/get-pending-invites.js'
import { createTestApp } from '../../create-test-app.js'

vi.mock('../../../src/lib/prisma.js', () => ({
  prisma: {
    user: { findUnique: vi.fn() },
    invite: { findMany: vi.fn() },
  },
}))

const stubInvites = [
  {
    id: 'invite-1',
    email: 'me@example.com',
    role: 'MEMBER',
    createdAt: new Date(),
    organization: { name: 'Acme Corp', avatarUrl: null },
    author: { name: 'Alice', avatarUrl: null },
  },
  {
    id: 'invite-2',
    email: 'me@example.com',
    role: 'ADMIN',
    createdAt: new Date(),
    organization: { name: 'Globex', avatarUrl: null },
    author: null,
  },
]

describe('GET /pending-invites', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns pending invites for current user — 200', async () => {
    const { prisma } = await import('../../../src/lib/prisma.js')

    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      email: 'me@example.com',
    } as never)
    vi.mocked(prisma.invite.findMany).mockResolvedValue(stubInvites as never)

    const app = await createTestApp()
    app.register(getPendingInvitesRoute)
    await app.ready()

    const token = app.jwt.sign({ sub: 'user-1' })

    const response = await app.inject({
      method: 'GET',
      url: '/pending-invites',
      headers: { authorization: `Bearer ${token}` },
    })

    expect(response.statusCode).toBe(200)
    expect(response.json().invites).toHaveLength(2)
    expect(response.json().invites[1].author).toBeNull()
  })

  it('returns empty list when no pending invites — 200', async () => {
    const { prisma } = await import('../../../src/lib/prisma.js')

    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      email: 'nobody@example.com',
    } as never)
    vi.mocked(prisma.invite.findMany).mockResolvedValue([])

    const app = await createTestApp()
    app.register(getPendingInvitesRoute)
    await app.ready()

    const token = app.jwt.sign({ sub: 'user-2' })

    const response = await app.inject({
      method: 'GET',
      url: '/pending-invites',
      headers: { authorization: `Bearer ${token}` },
    })

    expect(response.statusCode).toBe(200)
    expect(response.json().invites).toHaveLength(0)
  })

  it('returns 401 without token', async () => {
    const app = await createTestApp()
    app.register(getPendingInvitesRoute)
    await app.ready()

    const response = await app.inject({
      method: 'GET',
      url: '/pending-invites',
    })

    expect(response.statusCode).toBe(401)
  })
})
