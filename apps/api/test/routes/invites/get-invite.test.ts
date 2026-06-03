import { beforeEach, describe, expect, it, vi } from 'vitest'

import { getInviteRoute } from '../../../src/http/routes/invites/get-invite.js'
import { createTestApp } from '../../create-test-app.js'

vi.mock('../../../src/lib/prisma.js', () => ({
  prisma: {
    invite: { findUnique: vi.fn() },
  },
}))

const stubInvite = {
  id: 'invite-1',
  email: 'newbie@example.com',
  role: 'MEMBER',
  createdAt: new Date(),
  organization: { name: 'Acme Corp', avatarUrl: null },
  author: { name: 'Alice', avatarUrl: null },
}

describe('GET /invites/:inviteId', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns invite without authentication — 200', async () => {
    const { prisma } = await import('../../../src/lib/prisma.js')

    vi.mocked(prisma.invite.findUnique).mockResolvedValue(stubInvite as never)

    const app = await createTestApp()
    app.register(getInviteRoute)
    await app.ready()

    const response = await app.inject({
      method: 'GET',
      url: '/invites/invite-1',
    })

    expect(response.statusCode).toBe(200)
    expect(response.json().invite.id).toBe('invite-1')
    expect(response.json().invite.organization.name).toBe('Acme Corp')
  })

  it('returns 404 for unknown invite', async () => {
    const { prisma } = await import('../../../src/lib/prisma.js')

    vi.mocked(prisma.invite.findUnique).mockResolvedValue(null)

    const app = await createTestApp()
    app.register(getInviteRoute)
    await app.ready()

    const response = await app.inject({
      method: 'GET',
      url: '/invites/unknown',
    })

    expect(response.statusCode).toBe(404)
  })

  it('returns invite with null author — 200', async () => {
    const { prisma } = await import('../../../src/lib/prisma.js')

    vi.mocked(prisma.invite.findUnique).mockResolvedValue({
      ...stubInvite,
      author: null,
    } as never)

    const app = await createTestApp()
    app.register(getInviteRoute)
    await app.ready()

    const response = await app.inject({
      method: 'GET',
      url: '/invites/invite-1',
    })

    expect(response.statusCode).toBe(200)
    expect(response.json().invite.author).toBeNull()
  })
})
