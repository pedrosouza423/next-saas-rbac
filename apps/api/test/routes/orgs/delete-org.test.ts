import { beforeEach, describe, expect, it, vi } from 'vitest'

import { deleteOrgRoute } from '../../../src/http/routes/orgs/delete-org.js'
import { createTestApp } from '../../create-test-app.js'

vi.mock('../../../src/lib/prisma.js', () => ({
  prisma: {
    member: { findFirst: vi.fn() },
    organization: { delete: vi.fn() },
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

describe('DELETE /organizations/:slug', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('ADMIN can delete org — returns 204', async () => {
    const { prisma } = await import('../../../src/lib/prisma.js')

    vi.mocked(prisma.member.findFirst).mockResolvedValue(
      makeMember('ADMIN', 'user-1'),
    )
    vi.mocked(prisma.organization.delete).mockResolvedValue({} as never)

    const app = await createTestApp()
    app.register(deleteOrgRoute)
    await app.ready()

    const token = app.jwt.sign({ sub: 'user-1' })

    const response = await app.inject({
      method: 'DELETE',
      url: '/organizations/acme-corp',
      headers: { authorization: `Bearer ${token}` },
    })

    expect(response.statusCode).toBe(204)
    expect(prisma.organization.delete).toHaveBeenCalledWith({
      where: { id: 'org-1' },
    })
  })

  it('MEMBER cannot delete org — returns 403', async () => {
    const { prisma } = await import('../../../src/lib/prisma.js')

    vi.mocked(prisma.member.findFirst).mockResolvedValue(
      makeMember('MEMBER', 'user-2'),
    )

    const app = await createTestApp()
    app.register(deleteOrgRoute)
    await app.ready()

    const token = app.jwt.sign({ sub: 'user-2' })

    const response = await app.inject({
      method: 'DELETE',
      url: '/organizations/acme-corp',
      headers: { authorization: `Bearer ${token}` },
    })

    expect(response.statusCode).toBe(403)
  })

  it('BILLING cannot delete org — returns 403', async () => {
    const { prisma } = await import('../../../src/lib/prisma.js')

    vi.mocked(prisma.member.findFirst).mockResolvedValue(
      makeMember('BILLING', 'user-3'),
    )

    const app = await createTestApp()
    app.register(deleteOrgRoute)
    await app.ready()

    const token = app.jwt.sign({ sub: 'user-3' })

    const response = await app.inject({
      method: 'DELETE',
      url: '/organizations/acme-corp',
      headers: { authorization: `Bearer ${token}` },
    })

    expect(response.statusCode).toBe(403)
  })

  it('returns 401 without token', async () => {
    const app = await createTestApp()
    app.register(deleteOrgRoute)
    await app.ready()

    const response = await app.inject({
      method: 'DELETE',
      url: '/organizations/acme-corp',
    })

    expect(response.statusCode).toBe(401)
  })
})
