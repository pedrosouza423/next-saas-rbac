import type { FastifyInstance } from 'fastify'
import fp from 'fastify-plugin'
import { z } from 'zod/v4'

import { BadRequestError } from '../../errors/bad-request-error.js'
import { prisma } from '../../../lib/prisma.js'

export const getProfileRoute = fp(async (app: FastifyInstance) => {
  app.get(
    '/profile',
    {
      schema: {
        tags: ['auth'],
        summary: 'Get authenticated user profile',
        response: {
          200: z.object({
            id: z.string(),
            name: z.string().nullable(),
            email: z.string(),
            avatarUrl: z.string().nullable(),
          }),
        },
      },
    },
    async (request, reply) => {
      const userId = await request.getCurrentUserId()

      const user = await prisma.user.findUnique({ where: { id: userId } })
      if (!user) {
        throw new BadRequestError('User not found.')
      }

      return reply.status(200).send({
        id: user.id,
        name: user.name,
        email: user.email,
        avatarUrl: user.avatarUrl,
      })
    },
  )
})
