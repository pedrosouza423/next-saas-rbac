import { beforeEach, describe, expect, it, vi } from 'vitest'

import { createTestApp } from './create-test-app.js'

// Mock prisma to avoid real DB connections
vi.mock('../src/lib/prisma.js', () => ({
  prisma: {
    member: {
      findFirst: vi.fn(),
    },
  },
}))

describe('Auth Middleware', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getCurrentUserId', () => {
    it('returns userId from valid JWT', async () => {
      const app = await createTestApp()

      app.get('/test-auth', {
        handler: async (request) => {
          const userId = await request.getCurrentUserId()
          return { userId }
        },
      })

      await app.ready()

      const token = app.jwt.sign({ sub: 'user-123' })

      const response = await app.inject({
        method: 'GET',
        url: '/test-auth',
        headers: { authorization: `Bearer ${token}` },
      })

      expect(response.statusCode).toBe(200)
      expect(response.json().userId).toBe('user-123')
    })

    it('returns 401 when no token provided', async () => {
      const app = await createTestApp()

      app.get('/test-auth-missing', {
        handler: async (request) => {
          await request.getCurrentUserId()
          return { ok: true }
        },
      })

      await app.ready()

      const response = await app.inject({
        method: 'GET',
        url: '/test-auth-missing',
      })

      expect(response.statusCode).toBe(401)
      expect(response.json().message).toBe('Invalid auth token.')
    })

    it('returns 401 when token is invalid', async () => {
      const app = await createTestApp()

      app.get('/test-auth-invalid', {
        handler: async (request) => {
          await request.getCurrentUserId()
          return { ok: true }
        },
      })

      await app.ready()

      const response = await app.inject({
        method: 'GET',
        url: '/test-auth-invalid',
        headers: { authorization: 'Bearer invalid-token-here' },
      })

      expect(response.statusCode).toBe(401)
      expect(response.json().message).toBe('Invalid auth token.')
    })
  })

  describe('getUserMembership', () => {
    it('returns membership and organization when member exists', async () => {
      const { prisma } = await import('../src/lib/prisma.js')
      const mockMember = {
        id: 'member-1',
        role: 'ADMIN' as const,
        userId: 'user-123',
        organizationId: 'org-1',
        organization: {
          id: 'org-1',
          name: 'Acme',
          slug: 'acme',
          ownerId: 'user-123',
          domain: null,
          shouldAttachUsersByDomain: false,
          avatarUrl: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      }
      vi.mocked(prisma.member.findFirst).mockResolvedValue(mockMember as any)

      const app = await createTestApp()

      app.get('/test-membership', {
        handler: async (request) => {
          const result = await request.getUserMembership('acme')
          return {
            role: result.membership.role,
            orgSlug: result.organization.slug,
          }
        },
      })

      await app.ready()

      const token = app.jwt.sign({ sub: 'user-123' })

      const response = await app.inject({
        method: 'GET',
        url: '/test-membership',
        headers: { authorization: `Bearer ${token}` },
      })

      expect(response.statusCode).toBe(200)
      expect(response.json()).toEqual({ role: 'ADMIN', orgSlug: 'acme' })
    })

    it('returns 401 when user is not a member', async () => {
      const { prisma } = await import('../src/lib/prisma.js')
      vi.mocked(prisma.member.findFirst).mockResolvedValue(null)

      const app = await createTestApp()

      app.get('/test-not-member', {
        handler: async (request) => {
          await request.getUserMembership('unknown-org')
          return { ok: true }
        },
      })

      await app.ready()

      const token = app.jwt.sign({ sub: 'user-123' })

      const response = await app.inject({
        method: 'GET',
        url: '/test-not-member',
        headers: { authorization: `Bearer ${token}` },
      })

      expect(response.statusCode).toBe(401)
      expect(response.json().message).toBe(
        'You are not a member of this organization.',
      )
    })
  })
})
