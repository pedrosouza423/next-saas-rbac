import { beforeEach, describe, expect, it, vi } from 'vitest'

import { getOrgsRoute } from '../../../src/http/routes/orgs/get-orgs.js'
import { createTestApp } from '../../create-test-app.js'

vi.mock('../../../src/lib/prisma.js', () => ({
  prisma: {
    member: { findMany: vi.fn(), findFirst: vi.fn() },
  },
}))

const memberWithOrg = {
  id: 'member-1',
  role: 'ADMIN' as const,
  userId: 'user-1',
  organizationId: 'org-1',
  organization: {
    id: 'org-1',
    name: 'Acme Corp',
    slug: 'acme-corp',
    domain: null,
    shouldAttachUsersByDomain: false,
    avatarUrl: null,
    ownerId: 'user-1',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
}

describe('GET /organizations', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns list of organizations with role', async () => {
    const { prisma } = await import('../../../src/lib/prisma.js')

    vi.mocked(prisma.member.findMany).mockResolvedValue([memberWithOrg])

    const app = await createTestApp()
    app.register(getOrgsRoute)
    await app.ready()

    const token = app.jwt.sign({ sub: 'user-1' })

    const response = await app.inject({
      method: 'GET',
      url: '/organizations',
      headers: { authorization: `Bearer ${token}` },
    })

    expect(response.statusCode).toBe(200)
    expect(response.json()).toMatchObject({
      organizations: [
        {
          id: 'org-1',
          name: 'Acme Corp',
          slug: 'acme-corp',
          role: 'ADMIN',
        },
      ],
    })
  })

  it('returns empty list when user has no memberships', async () => {
    const { prisma } = await import('../../../src/lib/prisma.js')

    vi.mocked(prisma.member.findMany).mockResolvedValue([])

    const app = await createTestApp()
    app.register(getOrgsRoute)
    await app.ready()

    const token = app.jwt.sign({ sub: 'user-1' })

    const response = await app.inject({
      method: 'GET',
      url: '/organizations',
      headers: { authorization: `Bearer ${token}` },
    })

    expect(response.statusCode).toBe(200)
    expect(response.json().organizations).toHaveLength(0)
  })

  it('returns 401 without token', async () => {
    const app = await createTestApp()
    app.register(getOrgsRoute)
    await app.ready()

    const response = await app.inject({ method: 'GET', url: '/organizations' })

    expect(response.statusCode).toBe(401)
  })
})
