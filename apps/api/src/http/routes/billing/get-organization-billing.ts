import fp from 'fastify-plugin'
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { z } from 'zod/v4'

import { PRICE_PER_MEMBER, PRICE_PER_PROJECT } from '../../../lib/constants.js'
import { prisma } from '../../../lib/prisma.js'
import { ForbiddenError } from '../../errors/forbidden-error.js'
import { buildUserAbility } from '../../lib/build-ability.js'

const plugin: FastifyPluginAsyncZod = async (app) => {
  app.get(
    '/organizations/:slug/billing',
    {
      schema: {
        tags: ['billing'],
        summary: 'Get billing summary for an organization',
        security: [{ bearerAuth: [] }],
        params: z.object({ slug: z.string() }),
        response: {
          200: z.object({
            billing: z.object({
              amountOfMembers: z.number(),
              amountOfProjects: z.number(),
              pricePerMember: z.number(),
              pricePerProject: z.number(),
              total: z.number(),
            }),
          }),
        },
      },
    },
    async (request, reply) => {
      const { slug } = request.params
      const { organization, membership } = await request.getUserMembership(slug)

      const ability = buildUserAbility(membership)

      if (!ability.can('get', 'Billing')) {
        throw new ForbiddenError(
          'You are not allowed to get billing details from this organization.',
        )
      }

      const [amountOfMembers, amountOfProjects] = await Promise.all([
        prisma.member.count({
          where: { organizationId: organization.id, role: { not: 'BILLING' } },
        }),
        prisma.project.count({
          where: { organizationId: organization.id },
        }),
      ])

      const total =
        amountOfMembers * PRICE_PER_MEMBER + amountOfProjects * PRICE_PER_PROJECT

      return reply.status(200).send({
        billing: {
          amountOfMembers,
          amountOfProjects,
          pricePerMember: PRICE_PER_MEMBER,
          pricePerProject: PRICE_PER_PROJECT,
          total,
        },
      })
    },
  )
}

export const getOrganizationBillingRoute = fp(plugin)
