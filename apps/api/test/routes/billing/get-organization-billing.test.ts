import { beforeEach, describe, expect, it, vi } from 'vitest'

import { getOrganizationBillingRoute } from '../../../src/http/routes/billing/get-organization-billing.js'
import { createTestApp } from '../../create-test-app.js'

vi.mock('../../../src/lib/prisma.js', () => ({
  prisma: {
    member: { findFirst: vi.fn(), count: vi.fn() },
    project: { count: vi.fn() },
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

describe('GET /organizations/:slug/billing', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('ADMIN gets billing summary — returns 200 with correct total', async () => {
    const { prisma } = await import('../../../src/lib/prisma.js')

    vi.mocked(prisma.member.findFirst).mockResolvedValue(
      makeMember('ADMIN', 'user-1'),
    )
    vi.mocked(prisma.member.count).mockResolvedValue(3)
    vi.mocked(prisma.project.count).mockResolvedValue(2)

    const app = await createTestApp()
    app.register(getOrganizationBillingRoute)
    await app.ready()

    const token = app.jwt.sign({ sub: 'user-1' })

    const response = await app.inject({
      method: 'GET',
      url: '/organizations/acme-corp/billing',
      headers: { authorization: `Bearer ${token}` },
    })

    expect(response.statusCode).toBe(200)
    expect(response.json().billing).toEqual({
      amountOfMembers: 3,
      amountOfProjects: 2,
      pricePerMember: 10,
      pricePerProject: 20,
      total: 70,
    })
    expect(prisma.member.count).toHaveBeenCalledWith({
      where: { organizationId: 'org-1', role: { not: 'BILLING' } },
    })
    expect(prisma.project.count).toHaveBeenCalledWith({
      where: { organizationId: 'org-1' },
    })
  })

  it('BILLING gets billing summary — returns 200', async () => {
    const { prisma } = await import('../../../src/lib/prisma.js')

    vi.mocked(prisma.member.findFirst).mockResolvedValue(
      makeMember('BILLING', 'user-2'),
    )
    vi.mocked(prisma.member.count).mockResolvedValue(0)
    vi.mocked(prisma.project.count).mockResolvedValue(0)

    const app = await createTestApp()
    app.register(getOrganizationBillingRoute)
    await app.ready()

    const token = app.jwt.sign({ sub: 'user-2' })

    const response = await app.inject({
      method: 'GET',
      url: '/organizations/acme-corp/billing',
      headers: { authorization: `Bearer ${token}` },
    })

    expect(response.statusCode).toBe(200)
    expect(response.json().billing.total).toBe(0)
  })

  it('MEMBER cannot view billing — returns 403', async () => {
    const { prisma } = await import('../../../src/lib/prisma.js')

    vi.mocked(prisma.member.findFirst).mockResolvedValue(
      makeMember('MEMBER', 'user-3'),
    )

    const app = await createTestApp()
    app.register(getOrganizationBillingRoute)
    await app.ready()

    const token = app.jwt.sign({ sub: 'user-3' })

    const response = await app.inject({
      method: 'GET',
      url: '/organizations/acme-corp/billing',
      headers: { authorization: `Bearer ${token}` },
    })

    expect(response.statusCode).toBe(403)
  })

  it('returns 401 without token', async () => {
    const app = await createTestApp()
    app.register(getOrganizationBillingRoute)
    await app.ready()

    const response = await app.inject({
      method: 'GET',
      url: '/organizations/acme-corp/billing',
    })

    expect(response.statusCode).toBe(401)
  })
})
