import { beforeEach, describe, expect, it, vi } from 'vitest'

import { getProfileRoute } from '../../../src/http/routes/auth/get-profile.js'
import { createTestApp } from '../../create-test-app.js'

vi.mock('../../../src/lib/prisma.js', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
    member: {
      findFirst: vi.fn(),
    },
  },
}))

describe('GET /profile', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns user profile when authenticated', async () => {
    const { prisma } = await import('../../../src/lib/prisma.js')

    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: 'user-1',
      name: 'Pedro',
      email: 'pedro@example.com',
      passwordHash: 'hash',
      avatarUrl: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    const app = await createTestApp()
    app.register(getProfileRoute)
    await app.ready()

    const token = app.jwt.sign({ sub: 'user-1' })

    const response = await app.inject({
      method: 'GET',
      url: '/profile',
      headers: { authorization: `Bearer ${token}` },
    })

    expect(response.statusCode).toBe(200)
    expect(response.json()).toMatchObject({
      id: 'user-1',
      name: 'Pedro',
      email: 'pedro@example.com',
      avatarUrl: null,
    })
  })

  it('returns 401 when no token provided', async () => {
    const app = await createTestApp()
    app.register(getProfileRoute)
    await app.ready()

    const response = await app.inject({
      method: 'GET',
      url: '/profile',
    })

    expect(response.statusCode).toBe(401)
    expect(response.json().message).toBe('Invalid auth token.')
  })
})
