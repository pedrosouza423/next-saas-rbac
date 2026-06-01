import fp from 'fastify-plugin'
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { z } from 'zod/v4'

import { prisma } from '../../../lib/prisma.js'
import { NotFoundError } from '../../errors/not-found-error.js'

const plugin: FastifyPluginAsyncZod = async (app) => {
  app.get(
    '/organizations/:slug/projects/:projectSlug',
    {
      schema: {
        tags: ['projects'],
        summary: 'Get a project',
        security: [{ bearerAuth: [] }],
        params: z.object({ slug: z.string(), projectSlug: z.string() }),
        response: {
          200: z.object({
            project: z.object({
              id: z.string(),
              name: z.string(),
              slug: z.string(),
              description: z.string(),
              avatarUrl: z.string().nullable(),
              ownerId: z.string(),
              organizationId: z.string(),
              createdAt: z.date(),
              updatedAt: z.date(),
            }),
          }),
        },
      },
    },
    async (request, reply) => {
      const { slug, projectSlug } = request.params
      const { organization } = await request.getUserMembership(slug)

      const project = await prisma.project.findFirst({
        where: { slug: projectSlug, organizationId: organization.id },
      })

      if (!project) {
        throw new NotFoundError('Project not found.')
      }

      return reply.status(200).send({ project })
    },
  )
}

export const getProjectRoute = fp(plugin)
