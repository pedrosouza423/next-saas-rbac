import { beforeEach, describe, expect, it, vi } from 'vitest'

import { BadRequestError } from '../../../src/http/errors/bad-request-error.js'
import { authenticateWithGithubRoute } from '../../../src/http/routes/auth/authenticate-with-github.js'
import { createTestApp } from '../../create-test-app.js'

vi.mock('../../../src/lib/prisma.js', () => {
  const user = { findFirst: vi.fn(), findUnique: vi.fn(), create: vi.fn() }
  const account = { create: vi.fn(), upsert: vi.fn() }
  const organization = { findFirst: vi.fn() }
  const member = { create: vi.fn() }
  const $transaction = vi.fn((fn: (tx: unknown) => Promise<unknown>) =>
    fn({ user, account, organization, member }),
  )
  return { prisma: { user, account, organization, member, $transaction } }
})

vi.mock('../../../src/http/lib/github.js', () => ({
  getGithubUserData: vi.fn(),
}))

const BASE_GITHUB_DATA = {
  githubId: '42',
  name: 'Pedro Souza',
  email: 'pedro@example.com',
  avatarUrl: 'https://avatars.githubusercontent.com/u/42',
}

describe('POST /sessions/github', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 200 with token for existing GitHub account', async () => {
    const { prisma } = await import('../../../src/lib/prisma.js')
    const { getGithubUserData } = await import('../../../src/http/lib/github.js')

    vi.mocked(getGithubUserData).mockResolvedValue(BASE_GITHUB_DATA)
    vi.mocked(prisma.user.findFirst).mockResolvedValue({
      id: 'user-1',
      name: 'Pedro Souza',
      email: 'pedro@example.com',
      passwordHash: null,
      avatarUrl: BASE_GITHUB_DATA.avatarUrl,
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    const app = await createTestApp()
    app.register(authenticateWithGithubRoute)
    await app.ready()

    const response = await app.inject({
      method: 'POST',
      url: '/sessions/github',
      payload: { code: 'github-code-123' },
    })

    expect(response.statusCode).toBe(200)
    expect(typeof response.json().token).toBe('string')
    expect(prisma.user.findFirst).toHaveBeenCalledWith({
      where: {
        accounts: { some: { provider: 'GITHUB', providerAccountId: '42' } },
      },
    })
  })

  it('creates new user + account and returns 200 for first GitHub login', async () => {
    const { prisma } = await import('../../../src/lib/prisma.js')
    const { getGithubUserData } = await import('../../../src/http/lib/github.js')

    vi.mocked(getGithubUserData).mockResolvedValue(BASE_GITHUB_DATA)
    vi.mocked(prisma.user.findFirst).mockResolvedValue(null)
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null)
    vi.mocked(prisma.user.create).mockResolvedValue({
      id: 'user-new',
      name: 'Pedro Souza',
      email: 'pedro@example.com',
      passwordHash: null,
      avatarUrl: BASE_GITHUB_DATA.avatarUrl,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    vi.mocked(prisma.organization.findFirst).mockResolvedValue(null)

    const app = await createTestApp()
    app.register(authenticateWithGithubRoute)
    await app.ready()

    const response = await app.inject({
      method: 'POST',
      url: '/sessions/github',
      payload: { code: 'github-code-new' },
    })

    expect(response.statusCode).toBe(200)
    expect(typeof response.json().token).toBe('string')
    expect(prisma.user.create).toHaveBeenCalledWith({
      data: {
        name: 'Pedro Souza',
        email: 'pedro@example.com',
        avatarUrl: BASE_GITHUB_DATA.avatarUrl,
      },
    })
    expect(prisma.account.create).toHaveBeenCalledWith({
      data: { provider: 'GITHUB', providerAccountId: '42', userId: 'user-new' },
    })
  })

  it('links GitHub account to existing password user (auto-link)', async () => {
    const { prisma } = await import('../../../src/lib/prisma.js')
    const { getGithubUserData } = await import('../../../src/http/lib/github.js')

    vi.mocked(getGithubUserData).mockResolvedValue(BASE_GITHUB_DATA)
    vi.mocked(prisma.user.findFirst).mockResolvedValue(null)
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: 'user-existing',
      name: 'Pedro Souza',
      email: 'pedro@example.com',
      passwordHash: 'some-hash',
      avatarUrl: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    vi.mocked(prisma.account.upsert).mockResolvedValue({
      id: 'account-1',
      provider: 'GITHUB',
      providerAccountId: '42',
      userId: 'user-existing',
    })

    const app = await createTestApp()
    app.register(authenticateWithGithubRoute)
    await app.ready()

    const response = await app.inject({
      method: 'POST',
      url: '/sessions/github',
      payload: { code: 'github-code-link' },
    })

    expect(response.statusCode).toBe(200)
    expect(typeof response.json().token).toBe('string')
    expect(prisma.account.upsert).toHaveBeenCalledWith({
      where: { providerAccountId: '42' },
      create: { provider: 'GITHUB', providerAccountId: '42', userId: 'user-existing' },
      update: {},
    })
    expect(prisma.user.create).not.toHaveBeenCalled()
    // auto-attach does NOT run for existing users — they already ran it on account creation
    expect(prisma.organization.findFirst).not.toHaveBeenCalled()
  })

  it('auto-link is idempotent when account already exists (concurrent request)', async () => {
    const { prisma } = await import('../../../src/lib/prisma.js')
    const { getGithubUserData } = await import('../../../src/http/lib/github.js')

    vi.mocked(getGithubUserData).mockResolvedValue(BASE_GITHUB_DATA)
    vi.mocked(prisma.user.findFirst).mockResolvedValue(null)
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: 'user-existing',
      name: 'Pedro Souza',
      email: 'pedro@example.com',
      passwordHash: 'some-hash',
      avatarUrl: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    // upsert returns existing account on conflict — no error
    vi.mocked(prisma.account.upsert).mockResolvedValue({
      id: 'account-1',
      provider: 'GITHUB',
      providerAccountId: '42',
      userId: 'user-existing',
    })

    const app = await createTestApp()
    app.register(authenticateWithGithubRoute)
    await app.ready()

    const [r1, r2] = await Promise.all([
      app.inject({ method: 'POST', url: '/sessions/github', payload: { code: 'code-a' } }),
      app.inject({ method: 'POST', url: '/sessions/github', payload: { code: 'code-b' } }),
    ])

    expect(r1.statusCode).toBe(200)
    expect(r2.statusCode).toBe(200)
  })

  it('creates Member when organization with matching domain exists', async () => {
    const { prisma } = await import('../../../src/lib/prisma.js')
    const { getGithubUserData } = await import('../../../src/http/lib/github.js')

    vi.mocked(getGithubUserData).mockResolvedValue({
      ...BASE_GITHUB_DATA,
      email: 'pedro@acme.com',
    })
    vi.mocked(prisma.user.findFirst).mockResolvedValue(null)
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null)
    vi.mocked(prisma.user.create).mockResolvedValue({
      id: 'user-acme',
      name: 'Pedro Souza',
      email: 'pedro@acme.com',
      passwordHash: null,
      avatarUrl: BASE_GITHUB_DATA.avatarUrl,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    vi.mocked(prisma.organization.findFirst).mockResolvedValue({
      id: 'org-acme',
      name: 'Acme',
      slug: 'acme',
      domain: 'acme.com',
      shouldAttachUsersByDomain: true,
      avatarUrl: null,
      ownerId: 'owner-1',
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    vi.mocked(prisma.member.create).mockResolvedValue({
      id: 'member-1',
      role: 'MEMBER',
      userId: 'user-acme',
      organizationId: 'org-acme',
    })

    const app = await createTestApp()
    app.register(authenticateWithGithubRoute)
    await app.ready()

    const response = await app.inject({
      method: 'POST',
      url: '/sessions/github',
      payload: { code: 'github-code-acme' },
    })

    expect(response.statusCode).toBe(200)
    expect(prisma.member.create).toHaveBeenCalledWith({
      data: { userId: 'user-acme', organizationId: 'org-acme', role: 'MEMBER' },
    })
  })

  it('returns 400 when GitHub OAuth code is invalid', async () => {
    const { getGithubUserData } = await import('../../../src/http/lib/github.js')

    vi.mocked(getGithubUserData).mockRejectedValue(
      new BadRequestError('Invalid GitHub OAuth code.'),
    )

    const app = await createTestApp()
    app.register(authenticateWithGithubRoute)
    await app.ready()

    const response = await app.inject({
      method: 'POST',
      url: '/sessions/github',
      payload: { code: 'bad-code' },
    })

    expect(response.statusCode).toBe(400)
  })
})
