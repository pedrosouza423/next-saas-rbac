import { projectCan, projectSchema } from '@saas/auth'
import fp from 'fastify-plugin'
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { z } from 'zod/v4'

import { prisma } from '../../../lib/prisma.js'
import { ForbiddenError } from '../../errors/forbidden-error.js'
import { NotFoundError } from '../../errors/not-found-error.js'
import { buildUserAbility } from '../../lib/build-ability.js'

const plugin: FastifyPluginAsyncZod = async (app) => {
  app.delete(
    '/organizations/:slug/projects/:projectId',
    {
      schema: {
        tags: ['projects'],
        summary: 'Delete a project',
        security: [{ bearerAuth: [] }],
        params: z.object({ slug: z.string(), projectId: z.string() }),
        response: {
          204: z.object({}),
        },
      },
    },
    async (request, reply) => {
      const { slug, projectId } = request.params
      const { organization, membership } = await request.getUserMembership(slug)

      const ability = buildUserAbility(membership)

      // Fast path: role can never delete any project (e.g. BILLING)
      if (!ability.can('delete', 'Project')) {
        throw new ForbiddenError('You are not allowed to delete this project.')
      }

      const project = await prisma.project.findFirst({
        where: { id: projectId, organizationId: organization.id },
      })

      if (!project) {
        throw new NotFoundError('Project not found.')
      }

      const projectSubject = projectSchema.parse(project)

      if (!projectCan(ability, 'delete', projectSubject)) {
        throw new ForbiddenError('You are not allowed to delete this project.')
      }

      await prisma.project.delete({ where: { id: project.id } })

      return reply.status(204).send({})
    },
  )
}

export const deleteProjectRoute = fp(plugin)
