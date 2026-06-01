import { beforeEach, describe, expect, it, vi } from 'vitest'

import { transferOrgOwnershipRoute } from '../../../src/http/routes/orgs/transfer-org-ownership.js'
import { createTestApp } from '../../create-test-app.js'

vi.mock('../../../src/lib/prisma.js', () => ({
  prisma: {
    member: { findFirst: vi.fn(), findUnique: vi.fn(), update: vi.fn() },
    organization: { update: vi.fn() },
    $transaction: vi.fn((ops: unknown[]) => Promise.all(ops)),
  },
}))

function makeMemberWithOrg(userId: string, ownerId: string) {
  return {
    id: 'member-1',
    role: 'ADMIN' as const,
    userId,
    organizationId: 'org-1',
    organization: {
      id: 'org-1',
      name: 'Acme Corp',
      slug: 'acme-corp',
      domain: null,
      shouldAttachUsersByDomain: false,
      avatarUrl: null,
      ownerId,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  }
}

describe('PATCH /organizations/:slug/owner', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('owner can transfer ownership — returns 204', async () => {
    const { prisma } = await import('../../../src/lib/prisma.js')

    vi.mocked(prisma.member.findFirst).mockResolvedValue(
      makeMemberWithOrg('user-1', 'user-1'),
    )
    vi.mocked(prisma.member.findUnique).mockResolvedValue({
      id: 'member-2',
      role: 'MEMBER',
      userId: 'user-2',
      organizationId: 'org-1',
    })
    vi.mocked(prisma.organization.update).mockResolvedValue({} as never)
    vi.mocked(prisma.member.update).mockResolvedValue({} as never)

    const app = await createTestApp()
    app.register(transferOrgOwnershipRoute)
    await app.ready()

    const token = app.jwt.sign({ sub: 'user-1' })

    const response = await app.inject({
      method: 'PATCH',
      url: '/organizations/acme-corp/owner',
      headers: { authorization: `Bearer ${token}` },
      payload: { transferToUserId: 'user-2' },
    })

    expect(response.statusCode).toBe(204)
    expect(prisma.organization.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { ownerId: 'user-2' } }),
    )
    expect(prisma.member.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { role: 'ADMIN' } }),
    )
  })

  it('non-owner ADMIN cannot transfer ownership — returns 403', async () => {
    const { prisma } = await import('../../../src/lib/prisma.js')

    vi.mocked(prisma.member.findFirst).mockResolvedValue(
      makeMemberWithOrg('user-2', 'user-1'),
    )

    const app = await createTestApp()
    app.register(transferOrgOwnershipRoute)
    await app.ready()

    const token = app.jwt.sign({ sub: 'user-2' })

    const response = await app.inject({
      method: 'PATCH',
      url: '/organizations/acme-corp/owner',
      headers: { authorization: `Bearer ${token}` },
      payload: { transferToUserId: 'user-3' },
    })

    expect(response.statusCode).toBe(403)
  })

  it('returns 400 when transferring ownership to self', async () => {
    const { prisma } = await import('../../../src/lib/prisma.js')

    vi.mocked(prisma.member.findFirst).mockResolvedValue(
      makeMemberWithOrg('user-1', 'user-1'),
    )

    const app = await createTestApp()
    app.register(transferOrgOwnershipRoute)
    await app.ready()

    const token = app.jwt.sign({ sub: 'user-1' })

    const response = await app.inject({
      method: 'PATCH',
      url: '/organizations/acme-corp/owner',
      headers: { authorization: `Bearer ${token}` },
      payload: { transferToUserId: 'user-1' },
    })

    expect(response.statusCode).toBe(400)
    expect(response.json().message).toBe(
      'You cannot transfer ownership to yourself.',
    )
  })

  it('returns 400 when target user is not a member', async () => {
    const { prisma } = await import('../../../src/lib/prisma.js')

    vi.mocked(prisma.member.findFirst).mockResolvedValue(
      makeMemberWithOrg('user-1', 'user-1'),
    )
    vi.mocked(prisma.member.findUnique).mockResolvedValue(null)

    const app = await createTestApp()
    app.register(transferOrgOwnershipRoute)
    await app.ready()

    const token = app.jwt.sign({ sub: 'user-1' })

    const response = await app.inject({
      method: 'PATCH',
      url: '/organizations/acme-corp/owner',
      headers: { authorization: `Bearer ${token}` },
      payload: { transferToUserId: 'user-outsider' },
    })

    expect(response.statusCode).toBe(400)
    expect(response.json().message).toBe(
      'Target user is not a member of this organization.',
    )
  })

  it('returns 401 without token', async () => {
    const app = await createTestApp()
    app.register(transferOrgOwnershipRoute)
    await app.ready()

    const response = await app.inject({
      method: 'PATCH',
      url: '/organizations/acme-corp/owner',
      payload: { transferToUserId: 'user-2' },
    })

    expect(response.statusCode).toBe(401)
  })
})
