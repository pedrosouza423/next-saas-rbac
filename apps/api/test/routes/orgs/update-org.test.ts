import { beforeEach, describe, expect, it, vi } from 'vitest'

import { updateOrgRoute } from '../../../src/http/routes/orgs/update-org.js'
import { createTestApp } from '../../create-test-app.js'

vi.mock('../../../src/lib/prisma.js', () => ({
  prisma: {
    member: { findFirst: vi.fn() },
    organization: { findUnique: vi.fn(), update: vi.fn() },
  },
}))

function makeMember(role: 'ADMIN' | 'MEMBER' | 'BILLING', userId: string, ownerId: string) {
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
      ownerId,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  }
}

describe('PUT /organizations/:slug', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('ADMIN owner can update org — returns 204', async () => {
    const { prisma } = await import('../../../src/lib/prisma.js')

    vi.mocked(prisma.member.findFirst).mockResolvedValue(
      makeMember('ADMIN', 'user-1', 'user-1'),
    )
    vi.mocked(prisma.organization.update).mockResolvedValue({} as never)

    const app = await createTestApp()
    app.register(updateOrgRoute)
    await app.ready()

    const token = app.jwt.sign({ sub: 'user-1' })

    const response = await app.inject({
      method: 'PUT',
      url: '/organizations/acme-corp',
      headers: { authorization: `Bearer ${token}` },
      payload: { name: 'New Name' },
    })

    expect(response.statusCode).toBe(204)
    expect(prisma.organization.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ name: 'New Name' }) }),
    )
  })

  it('ADMIN non-owner cannot update org — returns 403', async () => {
    const { prisma } = await import('../../../src/lib/prisma.js')

    vi.mocked(prisma.member.findFirst).mockResolvedValue(
      makeMember('ADMIN', 'user-2', 'user-1'),
    )

    const app = await createTestApp()
    app.register(updateOrgRoute)
    await app.ready()

    const token = app.jwt.sign({ sub: 'user-2' })

    const response = await app.inject({
      method: 'PUT',
      url: '/organizations/acme-corp',
      headers: { authorization: `Bearer ${token}` },
      payload: { name: 'New Name' },
    })

    expect(response.statusCode).toBe(403)
  })

  it('MEMBER cannot update org — returns 403', async () => {
    const { prisma } = await import('../../../src/lib/prisma.js')

    vi.mocked(prisma.member.findFirst).mockResolvedValue(
      makeMember('MEMBER', 'user-2', 'user-1'),
    )

    const app = await createTestApp()
    app.register(updateOrgRoute)
    await app.ready()

    const token = app.jwt.sign({ sub: 'user-2' })

    const response = await app.inject({
      method: 'PUT',
      url: '/organizations/acme-corp',
      headers: { authorization: `Bearer ${token}` },
      payload: { name: 'New Name' },
    })

    expect(response.statusCode).toBe(403)
  })

  it('BILLING cannot update org — returns 403', async () => {
    const { prisma } = await import('../../../src/lib/prisma.js')

    vi.mocked(prisma.member.findFirst).mockResolvedValue(
      makeMember('BILLING', 'user-3', 'user-1'),
    )

    const app = await createTestApp()
    app.register(updateOrgRoute)
    await app.ready()

    const token = app.jwt.sign({ sub: 'user-3' })

    const response = await app.inject({
      method: 'PUT',
      url: '/organizations/acme-corp',
      headers: { authorization: `Bearer ${token}` },
      payload: { name: 'New Name' },
    })

    expect(response.statusCode).toBe(403)
  })

  it('returns 409 when new domain is already taken', async () => {
    const { prisma } = await import('../../../src/lib/prisma.js')

    vi.mocked(prisma.member.findFirst).mockResolvedValue(
      makeMember('ADMIN', 'user-1', 'user-1'),
    )
    vi.mocked(prisma.organization.findUnique).mockResolvedValue({
      id: 'other-org',
      name: 'Other',
      slug: 'other',
      domain: 'taken.com',
      shouldAttachUsersByDomain: false,
      avatarUrl: null,
      ownerId: 'other-owner',
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    const app = await createTestApp()
    app.register(updateOrgRoute)
    await app.ready()

    const token = app.jwt.sign({ sub: 'user-1' })

    const response = await app.inject({
      method: 'PUT',
      url: '/organizations/acme-corp',
      headers: { authorization: `Bearer ${token}` },
      payload: { domain: 'taken.com' },
    })

    expect(response.statusCode).toBe(409)
  })
})
