import fp from 'fastify-plugin'
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { z } from 'zod/v4'

import { prisma } from '../../../lib/prisma.js'

const plugin: FastifyPluginAsyncZod = async (app) => {
  app.get(
    '/organizations/:slug/members',
    {
      schema: {
        tags: ['members'],
        summary: 'List all members in an organization',
        security: [{ bearerAuth: [] }],
        params: z.object({ slug: z.string() }),
        response: {
          200: z.object({
            members: z.array(
              z.object({
                id: z.string(),
                role: z.enum(['ADMIN', 'MEMBER', 'BILLING']),
                user: z.object({
                  id: z.string(),
                  name: z.string().nullable(),
                  email: z.string(),
                  avatarUrl: z.string().nullable(),
                }),
              }),
            ),
          }),
        },
      },
    },
    async (request, reply) => {
      const { slug } = request.params
      const { organization } = await request.getUserMembership(slug)

      const members = await prisma.member.findMany({
        where: { organizationId: organization.id },
        select: {
          id: true,
          role: true,
          user: { select: { id: true, name: true, email: true, avatarUrl: true } },
        },
        orderBy: { role: 'asc' },
      })

      return reply.status(200).send({ members })
    },
  )
}

export const getMembersRoute = fp(plugin)
