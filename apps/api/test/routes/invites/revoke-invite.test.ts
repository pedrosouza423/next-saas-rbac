import { beforeEach, describe, expect, it, vi } from 'vitest'

import { revokeInviteRoute } from '../../../src/http/routes/invites/revoke-invite.js'
import { createTestApp } from '../../create-test-app.js'

vi.mock('../../../src/lib/prisma.js', () => ({
  prisma: {
    member: { findFirst: vi.fn() },
    invite: { findFirst: vi.fn(), delete: vi.fn() },
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

const stubInvite = { id: 'invite-1', email: 'newbie@example.com', role: 'MEMBER', organizationId: 'org-1' }

describe('DELETE /organizations/:slug/invites/:inviteId', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('ADMIN revokes invite — returns 204', async () => {
    const { prisma } = await import('../../../src/lib/prisma.js')

    vi.mocked(prisma.member.findFirst).mockResolvedValue(
      makeMember('ADMIN', 'user-1'),
    )
    vi.mocked(prisma.invite.findFirst).mockResolvedValue(stubInvite as never)
    vi.mocked(prisma.invite.delete).mockResolvedValue({} as never)

    const app = await createTestApp()
    app.register(revokeInviteRoute)
    await app.ready()

    const token = app.jwt.sign({ sub: 'user-1' })

    const response = await app.inject({
      method: 'DELETE',
      url: '/organizations/acme-corp/invites/invite-1',
      headers: { authorization: `Bearer ${token}` },
    })

    expect(response.statusCode).toBe(204)
    expect(prisma.invite.delete).toHaveBeenCalledWith({
      where: { id: 'invite-1' },
    })
  })

  it('MEMBER cannot revoke invite — returns 403', async () => {
    const { prisma } = await import('../../../src/lib/prisma.js')

    vi.mocked(prisma.member.findFirst).mockResolvedValue(
      makeMember('MEMBER', 'user-2'),
    )

    const app = await createTestApp()
    app.register(revokeInviteRoute)
    await app.ready()

    const token = app.jwt.sign({ sub: 'user-2' })

    const response = await app.inject({
      method: 'DELETE',
      url: '/organizations/acme-corp/invites/invite-1',
      headers: { authorization: `Bearer ${token}` },
    })

    expect(response.statusCode).toBe(403)
  })

  it('BILLING cannot revoke invite — returns 403', async () => {
    const { prisma } = await import('../../../src/lib/prisma.js')

    vi.mocked(prisma.member.findFirst).mockResolvedValue(
      makeMember('BILLING', 'user-3'),
    )

    const app = await createTestApp()
    app.register(revokeInviteRoute)
    await app.ready()

    const token = app.jwt.sign({ sub: 'user-3' })

    const response = await app.inject({
      method: 'DELETE',
      url: '/organizations/acme-corp/invites/invite-1',
      headers: { authorization: `Bearer ${token}` },
    })

    expect(response.statusCode).toBe(403)
  })

  it('returns 404 when invite not found in org', async () => {
    const { prisma } = await import('../../../src/lib/prisma.js')

    vi.mocked(prisma.member.findFirst).mockResolvedValue(
      makeMember('ADMIN', 'user-1'),
    )
    vi.mocked(prisma.invite.findFirst).mockResolvedValue(null)

    const app = await createTestApp()
    app.register(revokeInviteRoute)
    await app.ready()

    const token = app.jwt.sign({ sub: 'user-1' })

    const response = await app.inject({
      method: 'DELETE',
      url: '/organizations/acme-corp/invites/unknown',
      headers: { authorization: `Bearer ${token}` },
    })

    expect(response.statusCode).toBe(404)
  })

  it('returns 401 without token', async () => {
    const app = await createTestApp()
    app.register(revokeInviteRoute)
    await app.ready()

    const response = await app.inject({
      method: 'DELETE',
      url: '/organizations/acme-corp/invites/invite-1',
    })

    expect(response.statusCode).toBe(401)
  })
})
