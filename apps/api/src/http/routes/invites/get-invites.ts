import fp from 'fastify-plugin'
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { z } from 'zod/v4'

import { prisma } from '../../../lib/prisma.js'
import { ForbiddenError } from '../../errors/forbidden-error.js'
import { buildUserAbility } from '../../lib/build-ability.js'

const plugin: FastifyPluginAsyncZod = async (app) => {
  app.get(
    '/organizations/:slug/invites',
    {
      schema: {
        tags: ['invites'],
        summary: 'List pending invites for an organization',
        security: [{ bearerAuth: [] }],
        params: z.object({ slug: z.string() }),
        response: {
          200: z.object({
            invites: z.array(
              z.object({
                id: z.string(),
                email: z.string(),
                role: z.enum(['ADMIN', 'MEMBER', 'BILLING']),
                createdAt: z.date(),
                author: z
                  .object({
                    id: z.string(),
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
      const { slug } = request.params
      const { organization, membership } = await request.getUserMembership(slug)

      const ability = buildUserAbility(membership)

      if (!ability.can('get', 'Invite')) {
        throw new ForbiddenError('You are not allowed to list invites.')
      }

      const invites = await prisma.invite.findMany({
        where: { organizationId: organization.id },
        select: {
          id: true,
          email: true,
          role: true,
          createdAt: true,
          author: { select: { id: true, name: true, avatarUrl: true } },
        },
        orderBy: { createdAt: 'desc' },
      })

      return reply.status(200).send({ invites })
    },
  )
}

export const getInvitesRoute = fp(plugin)
