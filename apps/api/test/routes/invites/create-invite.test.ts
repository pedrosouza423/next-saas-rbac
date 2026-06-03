import { beforeEach, describe, expect, it, vi } from 'vitest'

import { createInviteRoute } from '../../../src/http/routes/invites/create-invite.js'
import { createTestApp } from '../../create-test-app.js'

vi.mock('../../../src/lib/prisma.js', () => ({
  prisma: {
    member: { findFirst: vi.fn() },
    invite: { create: vi.fn() },
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

const invitePayload = { email: 'newbie@example.com', role: 'MEMBER' }

describe('POST /organizations/:slug/invites', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('ADMIN creates invite — returns 201', async () => {
    const { prisma } = await import('../../../src/lib/prisma.js')

    vi.mocked(prisma.member.findFirst)
      .mockResolvedValueOnce(makeMember('ADMIN', 'user-1')) // getUserMembership
      .mockResolvedValueOnce(null) // existingMember check
    vi.mocked(prisma.invite.create).mockResolvedValue({
      id: 'invite-1',
    } as never)

    const app = await createTestApp()
    app.register(createInviteRoute)
    await app.ready()

    const token = app.jwt.sign({ sub: 'user-1' })

    const response = await app.inject({
      method: 'POST',
      url: '/organizations/acme-corp/invites',
      headers: { authorization: `Bearer ${token}` },
      payload: invitePayload,
    })

    expect(response.statusCode).toBe(201)
    expect(response.json().inviteId).toBe('invite-1')
  })

  it('MEMBER creates invite with MEMBER role — returns 201', async () => {
    const { prisma } = await import('../../../src/lib/prisma.js')

    vi.mocked(prisma.member.findFirst)
      .mockResolvedValueOnce(makeMember('MEMBER', 'user-2'))
      .mockResolvedValueOnce(null)
    vi.mocked(prisma.invite.create).mockResolvedValue({ id: 'invite-2' } as never)

    const app = await createTestApp()
    app.register(createInviteRoute)
    await app.ready()

    const token = app.jwt.sign({ sub: 'user-2' })

    const response = await app.inject({
      method: 'POST',
      url: '/organizations/acme-corp/invites',
      headers: { authorization: `Bearer ${token}` },
      payload: invitePayload,
    })

    expect(response.statusCode).toBe(201)
  })

  it('MEMBER cannot invite with BILLING role — returns 403', async () => {
    const { prisma } = await import('../../../src/lib/prisma.js')

    vi.mocked(prisma.member.findFirst).mockResolvedValueOnce(
      makeMember('MEMBER', 'user-2'),
    )

    const app = await createTestApp()
    app.register(createInviteRoute)
    await app.ready()

    const token = app.jwt.sign({ sub: 'user-2' })

    const response = await app.inject({
      method: 'POST',
      url: '/organizations/acme-corp/invites',
      headers: { authorization: `Bearer ${token}` },
      payload: { email: 'billing@example.com', role: 'BILLING' },
    })

    expect(response.statusCode).toBe(403)
  })

  it('BILLING cannot create invites — returns 403', async () => {
    const { prisma } = await import('../../../src/lib/prisma.js')

    vi.mocked(prisma.member.findFirst).mockResolvedValueOnce(
      makeMember('BILLING', 'user-3'),
    )

    const app = await createTestApp()
    app.register(createInviteRoute)
    await app.ready()

    const token = app.jwt.sign({ sub: 'user-3' })

    const response = await app.inject({
      method: 'POST',
      url: '/organizations/acme-corp/invites',
      headers: { authorization: `Bearer ${token}` },
      payload: invitePayload,
    })

    expect(response.statusCode).toBe(403)
  })

  it('returns 409 when invitee is already a member', async () => {
    const { prisma } = await import('../../../src/lib/prisma.js')

    vi.mocked(prisma.member.findFirst)
      .mockResolvedValueOnce(makeMember('ADMIN', 'user-1'))
      .mockResolvedValueOnce(makeMember('MEMBER', 'existing-user')) // already a member

    const app = await createTestApp()
    app.register(createInviteRoute)
    await app.ready()

    const token = app.jwt.sign({ sub: 'user-1' })

    const response = await app.inject({
      method: 'POST',
      url: '/organizations/acme-corp/invites',
      headers: { authorization: `Bearer ${token}` },
      payload: invitePayload,
    })

    expect(response.statusCode).toBe(409)
  })

  it('returns 409 on duplicate invite (P2002)', async () => {
    const { prisma } = await import('../../../src/lib/prisma.js')

    vi.mocked(prisma.member.findFirst)
      .mockResolvedValueOnce(makeMember('ADMIN', 'user-1'))
      .mockResolvedValueOnce(null)
    vi.mocked(prisma.invite.create).mockRejectedValue({ code: 'P2002' })

    const app = await createTestApp()
    app.register(createInviteRoute)
    await app.ready()

    const token = app.jwt.sign({ sub: 'user-1' })

    const response = await app.inject({
      method: 'POST',
      url: '/organizations/acme-corp/invites',
      headers: { authorization: `Bearer ${token}` },
      payload: invitePayload,
    })

    expect(response.statusCode).toBe(409)
  })

  it('returns 401 without token', async () => {
    const app = await createTestApp()
    app.register(createInviteRoute)
    await app.ready()

    const response = await app.inject({
      method: 'POST',
      url: '/organizations/acme-corp/invites',
      payload: invitePayload,
    })

    expect(response.statusCode).toBe(401)
  })
})
