import fp from 'fastify-plugin'
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { z } from 'zod/v4'

import { prisma } from '../../../lib/prisma.js'
import { ForbiddenError } from '../../errors/forbidden-error.js'
import { NotFoundError } from '../../errors/not-found-error.js'

const plugin: FastifyPluginAsyncZod = async (app) => {
  app.post(
    '/invites/:inviteId/reject',
    {
      schema: {
        tags: ['invites'],
        summary: 'Reject an invite',
        security: [{ bearerAuth: [] }],
        params: z.object({ inviteId: z.string() }),
        response: {
          204: z.object({}),
        },
      },
    },
    async (request, reply) => {
      const userId = await request.getCurrentUserId()
      const { inviteId } = request.params

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { email: true },
      })

      if (!user) {
        throw new ForbiddenError('User not found.')
      }

      const invite = await prisma.invite.findUnique({
        where: { id: inviteId },
      })

      if (!invite) {
        throw new NotFoundError('Invite not found.')
      }

      if (invite.email !== user.email) {
        throw new ForbiddenError('This invite belongs to another email address.')
      }

      await prisma.invite.delete({ where: { id: inviteId } })

      return reply.status(204).send({})
    },
  )
}

export const rejectInviteRoute = fp(plugin)
