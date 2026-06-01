import { organizationCan, organizationSchema } from '@saas/auth'
import fp from 'fastify-plugin'
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { z } from 'zod/v4'

import { prisma } from '../../../lib/prisma.js'
import { ConflictError } from '../../errors/conflict-error.js'
import { ForbiddenError } from '../../errors/forbidden-error.js'
import { buildUserAbility } from '../../lib/build-ability.js'

const plugin: FastifyPluginAsyncZod = async (app) => {
  app.put(
    '/organizations/:slug',
    {
      schema: {
        tags: ['orgs'],
        summary: 'Update an organization',
        security: [{ bearerAuth: [] }],
        params: z.object({ slug: z.string() }),
        body: z.object({
          name: z.string().optional(),
          domain: z.string().nullable().optional(),
          shouldAttachUsersByDomain: z.boolean().optional(),
        }),
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

      if (!organizationCan(ability, 'update', orgSubject)) {
        throw new ForbiddenError(
          'You are not allowed to update this organization.',
        )
      }

      const { name, domain, shouldAttachUsersByDomain } = request.body

      if (domain !== undefined && domain !== organization.domain) {
        if (domain !== null) {
          const existingByDomain = await prisma.organization.findUnique({
            where: { domain },
          })
          if (existingByDomain) {
            throw new ConflictError(
              'Another organization with the same domain already exists.',
            )
          }
        }
      }

      await prisma.organization.update({
        where: { id: organization.id },
        data: {
          ...(name !== undefined && { name }),
          ...(domain !== undefined && { domain }),
          ...(shouldAttachUsersByDomain !== undefined && {
            shouldAttachUsersByDomain,
          }),
        },
      })

      return reply.status(204).send({})
    },
  )
}

export const updateOrgRoute = fp(plugin)
