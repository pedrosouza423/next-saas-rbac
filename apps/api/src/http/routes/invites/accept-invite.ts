import fp from 'fastify-plugin'
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { z } from 'zod/v4'

import { prisma } from '../../../lib/prisma.js'
import { ConflictError } from '../../errors/conflict-error.js'
import { ForbiddenError } from '../../errors/forbidden-error.js'
import { NotFoundError } from '../../errors/not-found-error.js'
import { getInviteRecipient } from '../../lib/get-invite-recipient.js'

const plugin: FastifyPluginAsyncZod = async (app) => {
  app.post(
    '/invites/:inviteId/accept',
    {
      schema: {
        tags: ['invites'],
        summary: 'Accept an invite',
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

      // JWT is valid so user must exist; guard against stale tokens after deletion
      const user = await getInviteRecipient(userId)

      const invite = await prisma.invite.findUnique({
        where: { id: inviteId },
      })

      if (!invite) {
        throw new NotFoundError('Invite not found.')
      }

      if (invite.email !== user.email) {
        throw new ForbiddenError('This invite belongs to another email address.')
      }

      try {
        await prisma.$transaction([
          prisma.member.create({
            data: {
              userId,
              organizationId: invite.organizationId,
              role: invite.role,
            },
          }),
          prisma.invite.delete({ where: { id: inviteId } }),
        ])
      } catch (err) {
        const e = err as { code?: string }
        if (e?.code === 'P2002') {
          throw new ConflictError(
            'You are already a member of this organization.',
          )
        }
        if (e?.code === 'P2025') {
          throw new NotFoundError('Invite not found.')
        }
        throw err
      }

      return reply.status(204).send({})
    },
  )
}

export const acceptInviteRoute = fp(plugin)
