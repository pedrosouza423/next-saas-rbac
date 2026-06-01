import { organizationCan, organizationSchema } from '@saas/auth'
import fp from 'fastify-plugin'
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { z } from 'zod/v4'

import { prisma } from '../../../lib/prisma.js'
import { ForbiddenError } from '../../errors/forbidden-error.js'
import { buildUserAbility } from '../../lib/build-ability.js'

const plugin: FastifyPluginAsyncZod = async (app) => {
  app.delete(
    '/organizations/:slug',
    {
      schema: {
        tags: ['orgs'],
        summary: 'Delete an organization',
        security: [{ bearerAuth: [] }],
        params: z.object({ slug: z.string() }),
        response: {
          204: z.object({}),
        },
      },
    },
    async (request, reply) => {
      const { slug } = request.params
      const { organization, membership } = await request.getUserMembership(slug)

      const ability = buildUserAbility(membership)
      const orgSubject = organizationSchema.parse(organization)

      if (!organizationCan(ability, 'delete', orgSubject)) {
        throw new ForbiddenError(
          'You are not allowed to delete this organization.',
        )
      }

      await prisma.organization.delete({ where: { id: organization.id } })

      return reply.status(204).send({})
    },
  )
}

export const deleteOrgRoute = fp(plugin)
