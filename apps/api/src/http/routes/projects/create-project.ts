import { defineAbilityFor, userSchema } from '@saas/auth'
import fp from 'fastify-plugin'
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { z } from 'zod/v4'

import { prisma } from '../../../lib/prisma.js'
import { ConflictError } from '../../errors/conflict-error.js'
import { ForbiddenError } from '../../errors/forbidden-error.js'

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

const plugin: FastifyPluginAsyncZod = async (app) => {
  app.post(
    '/organizations/:slug/projects',
    {
      schema: {
        tags: ['projects'],
        summary: 'Create a new project',
        security: [{ bearerAuth: [] }],
        params: z.object({ slug: z.string() }),
        body: z.object({
          name: z.string(),
          description: z.string(),
          avatarUrl: z.string().nullable().optional(),
        }),
        response: {
          201: z.object({ projectId: z.string() }),
        },
      },
    },
    async (request, reply) => {
      const { slug } = request.params
      const { organization, membership } = await request.getUserMembership(slug)

      const ability = defineAbilityFor(
        userSchema.parse({ id: membership.userId, role: membership.role }),
      )

      if (!ability.can('create', 'Project')) {
        throw new ForbiddenError('You are not allowed to create projects.')
      }

      const { name, description, avatarUrl } = request.body
      const projectSlug = slugify(name)

      const existingBySlug = await prisma.project.findUnique({
        where: {
          slug_organizationId: { slug: projectSlug, organizationId: organization.id },
        },
      })
      if (existingBySlug) {
        throw new ConflictError(
          'A project with the same name (slug) already exists.',
        )
      }

      let project: { id: string }
      try {
        project = await prisma.project.create({
          data: {
            name,
            description,
            slug: projectSlug,
            avatarUrl: avatarUrl ?? null,
            ownerId: membership.userId,
            organizationId: organization.id,
          },
        })
      } catch (err) {
        const e = err as { code?: string; meta?: { target?: string[] } }
        if (e?.code === 'P2002' && e.meta?.target?.includes('slug')) {
          throw new ConflictError(
            'A project with the same name (slug) already exists.',
          )
        }
        throw err
      }

      return reply.status(201).send({ projectId: project.id })
    },
  )
}

export const createProjectRoute = fp(plugin)
