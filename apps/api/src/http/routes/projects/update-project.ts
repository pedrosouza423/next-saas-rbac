import { defineAbilityFor, projectCan, projectSchema, userSchema } from '@saas/auth'
import fp from 'fastify-plugin'
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { z } from 'zod/v4'

import { prisma } from '../../../lib/prisma.js'
import { ConflictError } from '../../errors/conflict-error.js'
import { ForbiddenError } from '../../errors/forbidden-error.js'
import { NotFoundError } from '../../errors/not-found-error.js'

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

const plugin: FastifyPluginAsyncZod = async (app) => {
  app.put(
    '/organizations/:slug/projects/:projectId',
    {
      schema: {
        tags: ['projects'],
        summary: 'Update a project',
        security: [{ bearerAuth: [] }],
        params: z.object({ slug: z.string(), projectId: z.string() }),
        body: z.object({
          name: z.string().optional(),
          description: z.string().optional(),
          avatarUrl: z.string().nullable().optional(),
        }),
        response: {
          204: z.object({}),
        },
      },
    },
    async (request, reply) => {
      const { slug, projectId } = request.params
      const { organization, membership } = await request.getUserMembership(slug)

      const project = await prisma.project.findFirst({
        where: { id: projectId, organizationId: organization.id },
      })

      if (!project) {
        throw new NotFoundError('Project not found.')
      }

      const ability = defineAbilityFor(
        userSchema.parse({ id: membership.userId, role: membership.role }),
      )
      const projectSubject = projectSchema.parse(project)

      if (!projectCan(ability, 'update', projectSubject)) {
        throw new ForbiddenError('You are not allowed to update this project.')
      }

      const { name, description, avatarUrl } = request.body

      let newSlug: string | undefined
      if (name !== undefined) {
        newSlug = slugify(name)
        if (newSlug !== project.slug) {
          const existingBySlug = await prisma.project.findUnique({
            where: {
              slug_organizationId: { slug: newSlug, organizationId: organization.id },
            },
          })
          if (existingBySlug) {
            throw new ConflictError(
              'A project with the same name (slug) already exists.',
            )
          }
        }
      }

      await prisma.project.update({
        where: { id: project.id },
        data: {
          ...(name !== undefined && { name, slug: newSlug }),
          ...(description !== undefined && { description }),
          ...(avatarUrl !== undefined && { avatarUrl }),
        },
      })

      return reply.status(204).send({})
    },
  )
}

export const updateProjectRoute = fp(plugin)
