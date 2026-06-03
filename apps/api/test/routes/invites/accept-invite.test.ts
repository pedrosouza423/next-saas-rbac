import { beforeEach, describe, expect, it, vi } from 'vitest'

import { acceptInviteRoute } from '../../../src/http/routes/invites/accept-invite.js'
import { createTestApp } from '../../create-test-app.js'

vi.mock('../../../src/lib/prisma.js', () => ({
  prisma: {
    user: { findUnique: vi.fn() },
    invite: { findUnique: vi.fn(), delete: vi.fn() },
    member: { findFirst: vi.fn(), create: vi.fn() },
    $transaction: vi.fn((ops: unknown[]) => Promise.all(ops)),
  },
}))

const stubInvite = {
  id: 'invite-1',
  email: 'newbie@example.com',
  role: 'MEMBER',
  organizationId: 'org-1',
}

describe('POST /invites/:inviteId/accept', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('accepts invite and creates member — returns 204', async () => {
    const { prisma } = await import('../../../src/lib/prisma.js')

    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      email: 'newbie@example.com',
    } as never)
    vi.mocked(prisma.invite.findUnique).mockResolvedValue(stubInvite as never)
    vi.mocked(prisma.member.findFirst).mockResolvedValue(null)
    vi.mocked(prisma.member.create).mockResolvedValue({} as never)

    const app = await createTestApp()
    app.register(acceptInviteRoute)
    await app.ready()

    const token = app.jwt.sign({ sub: 'user-1' })

    const response = await app.inject({
      method: 'POST',
      url: '/invites/invite-1/accept',
      headers: { authorization: `Bearer ${token}` },
    })

    expect(response.statusCode).toBe(204)
  })

  it('returns 403 when invite email does not match user email', async () => {
    const { prisma } = await import('../../../src/lib/prisma.js')

    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      email: 'other@example.com',
    } as never)
    vi.mocked(prisma.invite.findUnique).mockResolvedValue(stubInvite as never)

    const app = await createTestApp()
    app.register(acceptInviteRoute)
    await app.ready()

    const token = app.jwt.sign({ sub: 'user-1' })

    const response = await app.inject({
      method: 'POST',
      url: '/invites/invite-1/accept',
      headers: { authorization: `Bearer ${token}` },
    })

    expect(response.statusCode).toBe(403)
  })

  it('returns 409 when already a member', async () => {
    const { prisma } = await import('../../../src/lib/prisma.js')

    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      email: 'newbie@example.com',
    } as never)
    vi.mocked(prisma.invite.findUnique).mockResolvedValue(stubInvite as never)
    vi.mocked(prisma.member.findFirst).mockResolvedValue({
      id: 'member-existing',
    } as never)

    const app = await createTestApp()
    app.register(acceptInviteRoute)
    await app.ready()

    const token = app.jwt.sign({ sub: 'user-1' })

    const response = await app.inject({
      method: 'POST',
      url: '/invites/invite-1/accept',
      headers: { authorization: `Bearer ${token}` },
    })

    expect(response.statusCode).toBe(409)
  })

  it('returns 404 for unknown invite', async () => {
    const { prisma } = await import('../../../src/lib/prisma.js')

    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      email: 'newbie@example.com',
    } as never)
    vi.mocked(prisma.invite.findUnique).mockResolvedValue(null)

    const app = await createTestApp()
    app.register(acceptInviteRoute)
    await app.ready()

    const token = app.jwt.sign({ sub: 'user-1' })

    const response = await app.inject({
      method: 'POST',
      url: '/invites/invite-1/accept',
      headers: { authorization: `Bearer ${token}` },
    })

    expect(response.statusCode).toBe(404)
  })

  it('returns 401 without token', async () => {
    const app = await createTestApp()
    app.register(acceptInviteRoute)
    await app.ready()

    const response = await app.inject({
      method: 'POST',
      url: '/invites/invite-1/accept',
    })

    expect(response.statusCode).toBe(401)
  })
})
