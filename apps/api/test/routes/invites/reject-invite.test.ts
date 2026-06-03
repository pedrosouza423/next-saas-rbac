import { beforeEach, describe, expect, it, vi } from 'vitest'

import { rejectInviteRoute } from '../../../src/http/routes/invites/reject-invite.js'
import { createTestApp } from '../../create-test-app.js'

vi.mock('../../../src/lib/prisma.js', () => ({
  prisma: {
    user: { findUnique: vi.fn() },
    invite: { findUnique: vi.fn(), delete: vi.fn() },
  },
}))

const stubInvite = {
  id: 'invite-1',
  email: 'newbie@example.com',
  role: 'MEMBER',
  organizationId: 'org-1',
}

describe('POST /invites/:inviteId/reject', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('rejects invite — returns 204', async () => {
    const { prisma } = await import('../../../src/lib/prisma.js')

    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      email: 'newbie@example.com',
    } as never)
    vi.mocked(prisma.invite.findUnique).mockResolvedValue(stubInvite as never)
    vi.mocked(prisma.invite.delete).mockResolvedValue({} as never)

    const app = await createTestApp()
    app.register(rejectInviteRoute)
    await app.ready()

    const token = app.jwt.sign({ sub: 'user-1' })

    const response = await app.inject({
      method: 'POST',
      url: '/invites/invite-1/reject',
      headers: { authorization: `Bearer ${token}` },
    })

    expect(response.statusCode).toBe(204)
    expect(prisma.invite.delete).toHaveBeenCalledWith({
      where: { id: 'invite-1' },
    })
  })

  it('returns 403 when email does not match', async () => {
    const { prisma } = await import('../../../src/lib/prisma.js')

    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      email: 'other@example.com',
    } as never)
    vi.mocked(prisma.invite.findUnique).mockResolvedValue(stubInvite as never)

    const app = await createTestApp()
    app.register(rejectInviteRoute)
    await app.ready()

    const token = app.jwt.sign({ sub: 'user-1' })

    const response = await app.inject({
      method: 'POST',
      url: '/invites/invite-1/reject',
      headers: { authorization: `Bearer ${token}` },
    })

    expect(response.statusCode).toBe(403)
  })

  it('returns 404 for unknown invite', async () => {
    const { prisma } = await import('../../../src/lib/prisma.js')

    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      email: 'newbie@example.com',
    } as never)
    vi.mocked(prisma.invite.findUnique).mockResolvedValue(null)

    const app = await createTestApp()
    app.register(rejectInviteRoute)
    await app.ready()

    const token = app.jwt.sign({ sub: 'user-1' })

    const response = await app.inject({
      method: 'POST',
      url: '/invites/invite-1/reject',
      headers: { authorization: `Bearer ${token}` },
    })

    expect(response.statusCode).toBe(404)
  })

  it('returns 401 without token', async () => {
    const app = await createTestApp()
    app.register(rejectInviteRoute)
    await app.ready()

    const response = await app.inject({
      method: 'POST',
      url: '/invites/invite-1/reject',
    })

    expect(response.statusCode).toBe(401)
  })
})
