import { beforeEach, describe, expect, it, vi } from 'vitest'

import { createOrgRoute } from '../../../src/http/routes/orgs/create-org.js'
import { createTestApp } from '../../create-test-app.js'

vi.mock('../../../src/lib/prisma.js', () => {
  const organization = { findUnique: vi.fn(), create: vi.fn() }
  const member = { create: vi.fn() }
  const $transaction = vi.fn((fn: (tx: unknown) => Promise<unknown>) =>
    fn({ organization, member }),
  )
  return { prisma: { organization, member, $transaction } }
})

const orgPayload = { name: 'Acme Corp' }

const createdOrg = {
  id: 'org-1',
  name: 'Acme Corp',
  slug: 'acme-corp',
  domain: null,
  shouldAttachUsersByDomain: false,
  avatarUrl: null,
  ownerId: 'user-1',
  createdAt: new Date(),
  updatedAt: new Date(),
}

describe('POST /organizations', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('creates org and member, returns 201', async () => {
    const { prisma } = await import('../../../src/lib/prisma.js')

    vi.mocked(prisma.organization.findUnique).mockResolvedValue(null)
    vi.mocked(prisma.organization.create).mockResolvedValue(createdOrg)
    vi.mocked(prisma.member.create).mockResolvedValue({
      id: 'member-1',
      role: 'ADMIN',
      userId: 'user-1',
      organizationId: 'org-1',
    })

    const app = await createTestApp()
    app.register(createOrgRoute)
    await app.ready()

    const token = app.jwt.sign({ sub: 'user-1' })

    const response = await app.inject({
      method: 'POST',
      url: '/organizations',
      headers: { authorization: `Bearer ${token}` },
      payload: orgPayload,
    })

    expect(response.statusCode).toBe(201)
    expect(response.json().organizationId).toBe('org-1')
    expect(prisma.organization.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ slug: 'acme-corp', ownerId: 'user-1' }) }),
    )
    expect(prisma.member.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ role: 'ADMIN', userId: 'user-1' }) }),
    )
  })

  it('returns 409 when slug already exists', async () => {
    const { prisma } = await import('../../../src/lib/prisma.js')

    vi.mocked(prisma.organization.findUnique).mockResolvedValue(createdOrg)

    const app = await createTestApp()
    app.register(createOrgRoute)
    await app.ready()

    const token = app.jwt.sign({ sub: 'user-1' })

    const response = await app.inject({
      method: 'POST',
      url: '/organizations',
      headers: { authorization: `Bearer ${token}` },
      payload: orgPayload,
    })

    expect(response.statusCode).toBe(409)
  })

  it('returns 409 when domain already exists', async () => {
    const { prisma } = await import('../../../src/lib/prisma.js')

    vi.mocked(prisma.organization.findUnique)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(createdOrg)

    const app = await createTestApp()
    app.register(createOrgRoute)
    await app.ready()

    const token = app.jwt.sign({ sub: 'user-1' })

    const response = await app.inject({
      method: 'POST',
      url: '/organizations',
      headers: { authorization: `Bearer ${token}` },
      payload: { name: 'Other Org', domain: 'acme.com' },
    })

    expect(response.statusCode).toBe(409)
  })

  it('returns 401 without token', async () => {
    const app = await createTestApp()
    app.register(createOrgRoute)
    await app.ready()

    const response = await app.inject({
      method: 'POST',
      url: '/organizations',
      payload: orgPayload,
    })

    expect(response.statusCode).toBe(401)
  })
})
