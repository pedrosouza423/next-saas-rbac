import fp from 'fastify-plugin'
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { z } from 'zod/v4'

import { prisma } from '../../../lib/prisma.js'
import { BadRequestError } from '../../errors/bad-request-error.js'

const plugin: FastifyPluginAsyncZod = async (app) => {
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
}

export const getProfileRoute = fp(plugin)
