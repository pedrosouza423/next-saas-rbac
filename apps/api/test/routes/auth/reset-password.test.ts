import { beforeEach, describe, expect, it, vi } from 'vitest'

import { resetPasswordRoute } from '../../../src/http/routes/auth/reset-password.js'
import { createTestApp } from '../../create-test-app.js'

vi.mock('../../../src/lib/prisma.js', () => ({
  prisma: {
    token: {
      findUnique: vi.fn(),
      delete: vi.fn(),
    },
    user: {
      update: vi.fn(),
    },
    $transaction: vi.fn(),
    member: {
      findFirst: vi.fn(),
    },
  },
}))

describe('POST /password/reset', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 204 on valid token', async () => {
    const { prisma } = await import('../../../src/lib/prisma.js')

    vi.mocked(prisma.token.findUnique).mockResolvedValue({
      id: 'token-uuid-1',
      type: 'PASSWORD_RECOVER',
      userId: 'user-1',
      createdAt: new Date(),
    })

    const app = await createTestApp()
    app.register(resetPasswordRoute)
    await app.ready()

    const response = await app.inject({
      method: 'POST',
      url: '/password/reset',
      payload: { code: 'f47ac10b-58cc-4372-a567-0e02b2c3d479', password: 'newpassword' },
    })

    expect(response.statusCode).toBe(204)
    expect(prisma.$transaction).toHaveBeenCalled()
  })

  it('returns 400 when token does not exist', async () => {
    const { prisma } = await import('../../../src/lib/prisma.js')

    vi.mocked(prisma.token.findUnique).mockResolvedValue(null)

    const app = await createTestApp()
    app.register(resetPasswordRoute)
    await app.ready()

    const response = await app.inject({
      method: 'POST',
      url: '/password/reset',
      payload: { code: 'f47ac10b-58cc-4372-a567-0e02b2c3d479', password: 'newpassword' },
    })

    expect(response.statusCode).toBe(400)
    expect(response.json().message).toBe('Invalid token.')
  })

  it('returns 400 when token is older than 1 hour', async () => {
    const { prisma } = await import('../../../src/lib/prisma.js')

    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000)
    vi.mocked(prisma.token.findUnique).mockResolvedValue({
      id: 'token-uuid-1',
      type: 'PASSWORD_RECOVER',
      userId: 'user-1',
      createdAt: twoHoursAgo,
    })

    const app = await createTestApp()
    app.register(resetPasswordRoute)
    await app.ready()

    const response = await app.inject({
      method: 'POST',
      url: '/password/reset',
      payload: { code: 'f47ac10b-58cc-4372-a567-0e02b2c3d479', password: 'newpassword' },
    })

    expect(response.statusCode).toBe(400)
    expect(response.json().message).toBe('Token expired.')
    expect(prisma.token.delete).toHaveBeenCalledWith({ where: { id: 'token-uuid-1' } })
  })

  it('returns 400 when token type is not PASSWORD_RECOVER', async () => {
    const { prisma } = await import('../../../src/lib/prisma.js')

    vi.mocked(prisma.token.findUnique).mockResolvedValue({
      id: 'token-uuid-1',
      type: 'INVITE',
      userId: 'user-1',
      createdAt: new Date(),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any)

    const app = await createTestApp()
    app.register(resetPasswordRoute)
    await app.ready()

    const response = await app.inject({
      method: 'POST',
      url: '/password/reset',
      payload: { code: 'f47ac10b-58cc-4372-a567-0e02b2c3d479', password: 'newpassword' },
    })

    expect(response.statusCode).toBe(400)
    expect(response.json().message).toBe('Invalid token.')
  })
})
