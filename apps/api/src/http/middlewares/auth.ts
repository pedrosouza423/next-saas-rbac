import fastifyJwt from '@fastify/jwt'
import type { FastifyInstance, FastifyRequest } from 'fastify'
import fp from 'fastify-plugin'

import { env } from '../../env.js'
import { prisma } from '../../lib/prisma.js'
import { UnauthorizedError } from '../errors/unauthorized-error.js'

declare module '@fastify/jwt' {
  interface FastifyJWT {
    user: {
      sub: string
    }
  }
}

declare module 'fastify' {
  interface FastifyRequest {
    getCurrentUserId(): Promise<string>
    getUserMembership(organizationSlug: string): Promise<{
      organization: {
        id: string
        slug: string
        name: string
        ownerId: string
        avatarUrl: string | null
        domain: string | null
        shouldAttachUsersByDomain: boolean
        createdAt: Date
        updatedAt: Date
      }
      membership: {
        id: string
        role: 'ADMIN' | 'MEMBER' | 'BILLING'
        userId: string
        organizationId: string
      }
    }>
  }
}

async function authPlugin(app: FastifyInstance) {
  await app.register(fastifyJwt, {
    secret: env.JWT_SECRET,
  })

  app.decorateRequest(
    'getCurrentUserId',
    async function (this: FastifyRequest) {
      try {
        const { sub } = await this.jwtVerify<{ sub: string }>()
        return sub
      } catch {
        throw new UnauthorizedError('Invalid auth token.')
      }
    },
  )

  app.decorateRequest(
    'getUserMembership',
    async function (this: FastifyRequest, organizationSlug: string) {
      const userId = await this.getCurrentUserId()

      const member = await prisma.member.findFirst({
        where: {
          userId,
          organization: {
            slug: organizationSlug,
          },
        },
        include: {
          organization: true,
        },
      })

      if (!member) {
        throw new UnauthorizedError(
          'You are not a member of this organization.',
        )
      }

      const { organization, ...membership } = member

      return { organization, membership }
    },
  )
}

export const auth = fp(authPlugin)
