import { beforeEach, describe, expect, it, vi } from 'vitest'

import { getOrgMembershipRoute } from '../../../src/http/routes/orgs/get-org-membership.js'
import { createTestApp } from '../../create-test-app.js'

vi.mock('../../../src/lib/prisma.js', () => ({
  prisma: {
    member: { findFirst: vi.fn() },
  },
}))

const memberWithOrg = {
  id: 'member-1',
  role: 'BILLING' as const,
  userId: 'user-1',
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

describe('GET /organizations/:slug/membership', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns current user membership', async () => {
    const { prisma } = await import('../../../src/lib/prisma.js')

    vi.mocked(prisma.member.findFirst).mockResolvedValue(memberWithOrg)

    const app = await createTestApp()
    app.register(getOrgMembershipRoute)
    await app.ready()

    const token = app.jwt.sign({ sub: 'user-1' })

    const response = await app.inject({
      method: 'GET',
      url: '/organizations/acme-corp/membership',
      headers: { authorization: `Bearer ${token}` },
    })

    expect(response.statusCode).toBe(200)
    expect(response.json().membership).toMatchObject({
      id: 'member-1',
      role: 'BILLING',
      organizationId: 'org-1',
      userId: 'user-1',
    })
  })

  it('returns 401 when not a member', async () => {
    const { prisma } = await import('../../../src/lib/prisma.js')

    vi.mocked(prisma.member.findFirst).mockResolvedValue(null)

    const app = await createTestApp()
    app.register(getOrgMembershipRoute)
    await app.ready()

    const token = app.jwt.sign({ sub: 'user-1' })

    const response = await app.inject({
      method: 'GET',
      url: '/organizations/acme-corp/membership',
      headers: { authorization: `Bearer ${token}` },
    })

    expect(response.statusCode).toBe(401)
  })
})
