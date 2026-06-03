import fp from 'fastify-plugin'
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { z } from 'zod/v4'

import { prisma } from '../../../lib/prisma.js'
import { NotFoundError } from '../../errors/not-found-error.js'

const plugin: FastifyPluginAsyncZod = async (app) => {
  app.get(
    '/invites/:inviteId',
    {
      schema: {
        tags: ['invites'],
        summary: 'Get an invite by ID (public)',
        params: z.object({ inviteId: z.string() }),
        response: {
          200: z.object({
            invite: z.object({
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
          }),
        },
      },
    },
    async (request, reply) => {
      const { inviteId } = request.params

      const invite = await prisma.invite.findUnique({
        where: { id: inviteId },
        select: {
          id: true,
          email: true,
          role: true,
          createdAt: true,
          organization: { select: { name: true, avatarUrl: true } },
          author: { select: { name: true, avatarUrl: true } },
        },
      })

      if (!invite) {
        throw new NotFoundError('Invite not found.')
      }

      return reply.status(200).send({ invite })
    },
  )
}

export const getInviteRoute = fp(plugin)
