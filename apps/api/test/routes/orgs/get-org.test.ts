import { beforeEach, describe, expect, it, vi } from 'vitest'

import { getOrgRoute } from '../../../src/http/routes/orgs/get-org.js'
import { createTestApp } from '../../create-test-app.js'

vi.mock('../../../src/lib/prisma.js', () => ({
  prisma: {
    member: { findFirst: vi.fn() },
  },
}))

const memberWithOrg = {
  id: 'member-1',
  role: 'MEMBER' as const,
  userId: 'user-1',
  organizationId: 'org-1',
  organization: {
    id: 'org-1',
    name: 'Acme Corp',
    slug: 'acme-corp',
    domain: 'acme.com',
    shouldAttachUsersByDomain: true,
    avatarUrl: null,
    ownerId: 'owner-1',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
}

describe('GET /organizations/:slug', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns organization details for a member', async () => {
    const { prisma } = await import('../../../src/lib/prisma.js')

    vi.mocked(prisma.member.findFirst).mockResolvedValue(memberWithOrg)

    const app = await createTestApp()
    app.register(getOrgRoute)
    await app.ready()

    const token = app.jwt.sign({ sub: 'user-1' })

    const response = await app.inject({
      method: 'GET',
      url: '/organizations/acme-corp',
      headers: { authorization: `Bearer ${token}` },
    })

    expect(response.statusCode).toBe(200)
    expect(response.json().organization).toMatchObject({
      id: 'org-1',
      name: 'Acme Corp',
      slug: 'acme-corp',
      ownerId: 'owner-1',
    })
  })

  it('returns 401 when not a member', async () => {
    const { prisma } = await import('../../../src/lib/prisma.js')

    vi.mocked(prisma.member.findFirst).mockResolvedValue(null)

    const app = await createTestApp()
    app.register(getOrgRoute)
    await app.ready()

    const token = app.jwt.sign({ sub: 'user-1' })

    const response = await app.inject({
      method: 'GET',
      url: '/organizations/acme-corp',
      headers: { authorization: `Bearer ${token}` },
    })

    expect(response.statusCode).toBe(401)
  })

  it('returns 401 without token', async () => {
    const app = await createTestApp()
    app.register(getOrgRoute)
    await app.ready()

    const response = await app.inject({
      method: 'GET',
      url: '/organizations/acme-corp',
    })

    expect(response.statusCode).toBe(401)
  })
})
