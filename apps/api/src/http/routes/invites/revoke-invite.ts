import fp from 'fastify-plugin'
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { z } from 'zod/v4'

import { prisma } from '../../../lib/prisma.js'
import { ForbiddenError } from '../../errors/forbidden-error.js'
import { NotFoundError } from '../../errors/not-found-error.js'
import { buildUserAbility } from '../../lib/build-ability.js'

const plugin: FastifyPluginAsyncZod = async (app) => {
  app.delete(
    '/organizations/:slug/invites/:inviteId',
    {
      schema: {
        tags: ['invites'],
        summary: 'Revoke an invite',
        security: [{ bearerAuth: [] }],
        params: z.object({ slug: z.string(), inviteId: z.string() }),
        response: {
          204: z.object({}),
        },
      },
    },
    async (request, reply) => {
      const { slug, inviteId } = request.params
      const { organization, membership } = await request.getUserMembership(slug)

      const ability = buildUserAbility(membership)

      if (!ability.can('delete', 'Invite')) {
        throw new ForbiddenError('You are not allowed to revoke invites.')
      }

      const invite = await prisma.invite.findFirst({
        where: { id: inviteId, organizationId: organization.id },
      })

      if (!invite) {
        throw new NotFoundError('Invite not found.')
      }

      await prisma.invite.delete({ where: { id: inviteId } })

      return reply.status(204).send({})
    },
  )
}

export const revokeInviteRoute = fp(plugin)
