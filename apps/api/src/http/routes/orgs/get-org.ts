import fp from 'fastify-plugin'
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { z } from 'zod/v4'

const plugin: FastifyPluginAsyncZod = async (app) => {
  app.get(
    '/organizations/:slug',
    {
      schema: {
        tags: ['orgs'],
        summary: 'Get organization details',
        security: [{ bearerAuth: [] }],
        params: z.object({ slug: z.string() }),
        response: {
          200: z.object({
            organization: z.object({
              id: z.string(),
              name: z.string(),
              slug: z.string(),
              domain: z.string().nullable(),
              shouldAttachUsersByDomain: z.boolean(),
              avatarUrl: z.string().nullable(),
              ownerId: z.string(),
              createdAt: z.date(),
              updatedAt: z.date(),
            }),
          }),
        },
      },
    },
    async (request, reply) => {
      const { slug } = request.params
      const { organization } = await request.getUserMembership(slug)

      return reply.status(200).send({ organization })
    },
  )
}

export const getOrgRoute = fp(plugin)
