import bcrypt from 'bcryptjs'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { authenticateWithPasswordRoute } from '../../../src/http/routes/auth/authenticate-with-password.js'
import { createTestApp } from '../../create-test-app.js'

vi.mock('../../../src/lib/prisma.js', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
  },
}))

describe('POST /sessions/password', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 200 with token on valid credentials', async () => {
    const { prisma } = await import('../../../src/lib/prisma.js')
    const hash = await bcrypt.hash('secret123', 6)

    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: 'user-1',
      name: 'Pedro',
      email: 'pedro@example.com',
      passwordHash: hash,
      avatarUrl: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    const app = await createTestApp()
    app.register(authenticateWithPasswordRoute)
    await app.ready()

    const response = await app.inject({
      method: 'POST',
      url: '/sessions/password',
      payload: { email: 'pedro@example.com', password: 'secret123' },
    })

    expect(response.statusCode).toBe(200)
    expect(typeof response.json().token).toBe('string')
  })

  it('returns 400 when user does not exist', async () => {
    const { prisma } = await import('../../../src/lib/prisma.js')
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null)

    const app = await createTestApp()
    app.register(authenticateWithPasswordRoute)
    await app.ready()

    const response = await app.inject({
      method: 'POST',
      url: '/sessions/password',
      payload: { email: 'nobody@example.com', password: 'secret123' },
    })

    expect(response.statusCode).toBe(400)
    expect(response.json().message).toBe('Invalid credentials.')
  })

  it('returns 400 when password is wrong', async () => {
    const { prisma } = await import('../../../src/lib/prisma.js')
    const hash = await bcrypt.hash('correct', 6)

    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: 'user-1',
      name: 'Pedro',
      email: 'pedro@example.com',
      passwordHash: hash,
      avatarUrl: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    const app = await createTestApp()
    app.register(authenticateWithPasswordRoute)
    await app.ready()

    const response = await app.inject({
      method: 'POST',
      url: '/sessions/password',
      payload: { email: 'pedro@example.com', password: 'wrong' },
    })

    expect(response.statusCode).toBe(400)
    expect(response.json().message).toBe('Invalid credentials.')
  })

  it('returns 400 when account has no password (OAuth-only)', async () => {
    const { prisma } = await import('../../../src/lib/prisma.js')

    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: 'user-1',
      name: 'Pedro',
      email: 'pedro@example.com',
      passwordHash: null,
      avatarUrl: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    const app = await createTestApp()
    app.register(authenticateWithPasswordRoute)
    await app.ready()

    const response = await app.inject({
      method: 'POST',
      url: '/sessions/password',
      payload: { email: 'pedro@example.com', password: 'any' },
    })

    expect(response.statusCode).toBe(400)
    expect(response.json().message).toBe('Invalid credentials.')
  })
})
