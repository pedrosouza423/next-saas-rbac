import { beforeEach, describe, expect, it, vi } from 'vitest'

import { createTestApp } from '../../create-test-app.js'
import { requestPasswordRecoverRoute } from '../../../src/http/routes/auth/request-password-recover.js'

vi.mock('../../../src/lib/prisma.js', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
    token: {
      create: vi.fn(),
    },
    member: {
      findFirst: vi.fn(),
    },
  },
}))

describe('POST /password/recover', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 201 and creates token when user exists', async () => {
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
    vi.mocked(prisma.token.create).mockResolvedValue({
      id: 'token-uuid-1',
      type: 'PASSWORD_RECOVER',
      userId: 'user-1',
      createdAt: new Date(),
    })

    const app = await createTestApp()
    app.register(requestPasswordRecoverRoute)
    await app.ready()

    const response = await app.inject({
      method: 'POST',
      url: '/password/recover',
      payload: { email: 'pedro@example.com' },
    })

    expect(response.statusCode).toBe(201)
    expect(prisma.token.create).toHaveBeenCalledWith({
      data: { type: 'PASSWORD_RECOVER', userId: 'user-1' },
    })
  })

  it('returns 201 without creating token when user does not exist', async () => {
    const { prisma } = await import('../../../src/lib/prisma.js')

    vi.mocked(prisma.user.findUnique).mockResolvedValue(null)

    const app = await createTestApp()
    app.register(requestPasswordRecoverRoute)
    await app.ready()

    const response = await app.inject({
      method: 'POST',
      url: '/password/recover',
      payload: { email: 'nobody@example.com' },
    })

    expect(response.statusCode).toBe(201)
    expect(prisma.token.create).not.toHaveBeenCalled()
  })
})
