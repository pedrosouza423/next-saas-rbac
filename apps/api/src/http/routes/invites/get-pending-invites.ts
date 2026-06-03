import fp from 'fastify-plugin'
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { z } from 'zod/v4'

import { prisma } from '../../../lib/prisma.js'
import { ForbiddenError } from '../../errors/forbidden-error.js'

const plugin: FastifyPluginAsyncZod = async (app) => {
  app.get(
    '/pending-invites',
    {
      schema: {
        tags: ['invites'],
        summary: 'List pending invites for the current user',
        security: [{ bearerAuth: [] }],
        response: {
          200: z.object({
            invites: z.array(
              z.object({
                id: z.string(),
                email: z.string(),
                role: z.enum(['ADMIN', 'MEMBER', 'BILLING']),
                createdAt: z.date(),
                organization: z.object({
                  name: z.string(),
                  avatarUrl: z.string().nullable(),
                }),
                author: z
                  .object({
                    name: z.string().nullable(),
                    avatarUrl: z.string().nullable(),
                  })
                  .nullable(),
              }),
            ),
          }),
        },
      },
    },
    async (request, reply) => {
      const userId = await request.getCurrentUserId()

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { email: true },
      })

      if (!user) {
        throw new ForbiddenError('User not found.')
      }

      const invites = await prisma.invite.findMany({
        where: { email: user.email },
        select: {
          id: true,
          email: true,
          role: true,
          createdAt: true,
          organization: { select: { name: true, avatarUrl: true } },
          author: { select: { name: true, avatarUrl: true } },
        },
        orderBy: { createdAt: 'desc' },
      })

      return reply.status(200).send({ invites })
    },
  )
}

export const getPendingInvitesRoute = fp(plugin)
