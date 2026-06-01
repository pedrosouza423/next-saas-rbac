import fp from 'fastify-plugin'
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { z } from 'zod/v4'

import { prisma } from '../../../lib/prisma.js'

const plugin: FastifyPluginAsyncZod = async (app) => {
  app.get(
    '/organizations/:slug/projects',
    {
      schema: {
        tags: ['projects'],
        summary: 'List all projects in an organization',
        security: [{ bearerAuth: [] }],
        params: z.object({ slug: z.string() }),
        response: {
          200: z.object({
            projects: z.array(
              z.object({
                id: z.string(),
                name: z.string(),
                slug: z.string(),
                description: z.string(),
                avatarUrl: z.string().nullable(),
                createdAt: z.date(),
                updatedAt: z.date(),
                owner: z.object({
                  id: z.string(),
                  name: z.string().nullable(),
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

      const projects = await prisma.project.findMany({
        where: { organizationId: organization.id },
        include: {
          owner: { select: { id: true, name: true, avatarUrl: true } },
        },
        orderBy: { createdAt: 'desc' },
      })

      return reply.status(200).send({ projects })
    },
  )
}

export const getProjectsRoute = fp(plugin)
