import fp from 'fastify-plugin'
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { z } from 'zod/v4'

const plugin: FastifyPluginAsyncZod = async (app) => {
  app.get(
    '/organizations/:slug/membership',
    {
      schema: {
        tags: ['orgs'],
        summary: 'Get current user membership in an organization',
        security: [{ bearerAuth: [] }],
        params: z.object({ slug: z.string() }),
        response: {
          200: z.object({
            membership: z.object({
              id: z.string(),
              role: z.enum(['ADMIN', 'MEMBER', 'BILLING']),
              organizationId: z.string(),
              userId: z.string(),
            }),
          }),
        },
      },
    },
    async (request, reply) => {
      const { slug } = request.params
      const { membership } = await request.getUserMembership(slug)

      return reply.status(200).send({ membership })
    },
  )
}

export const getOrgMembershipRoute = fp(plugin)
