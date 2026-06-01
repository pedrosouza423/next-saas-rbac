import fp from 'fastify-plugin'
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { z } from 'zod/v4'

import { prisma } from '../../../lib/prisma.js'

const plugin: FastifyPluginAsyncZod = async (app) => {
  app.get(
    '/organizations',
    {
      schema: {
        tags: ['orgs'],
        summary: 'List organizations where user is a member',
        security: [{ bearerAuth: [] }],
        response: {
          200: z.object({
            organizations: z.array(
              z.object({
                id: z.string(),
                name: z.string(),
                slug: z.string(),
                avatarUrl: z.string().nullable(),
                role: z.enum(['ADMIN', 'MEMBER', 'BILLING']),
              }),
            ),
          }),
        },
      },
    },
    async (request, reply) => {
      const userId = await request.getCurrentUserId()

      const members = await prisma.member.findMany({
        where: { userId },
        include: { organization: true },
      })

      const organizations = members.map(({ role, organization }) => ({
        id: organization.id,
        name: organization.name,
        slug: organization.slug,
        avatarUrl: organization.avatarUrl,
        role,
      }))

      return reply.status(200).send({ organizations })
    },
  )
}

export const getOrgsRoute = fp(plugin)
