import fp from 'fastify-plugin'
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { z } from 'zod/v4'

import { prisma } from '../../../lib/prisma.js'
import { ConflictError } from '../../errors/conflict-error.js'

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
    '/organizations',
    {
      schema: {
        tags: ['orgs'],
        summary: 'Create a new organization',
        security: [{ bearerAuth: [] }],
        body: z.object({
          name: z.string(),
          domain: z.string().nullable().optional(),
          shouldAttachUsersByDomain: z.boolean().optional(),
        }),
        response: {
          201: z.object({ organizationId: z.string() }),
        },
      },
    },
    async (request, reply) => {
      const userId = await request.getCurrentUserId()
      const { name, domain, shouldAttachUsersByDomain } = request.body

      const slug = slugify(name)

      const existingBySlug = await prisma.organization.findUnique({
        where: { slug },
      })
      if (existingBySlug) {
        throw new ConflictError(
          'Another organization with the same name (slug) already exists.',
        )
      }

      if (domain) {
        const existingByDomain = await prisma.organization.findUnique({
          where: { domain },
        })
        if (existingByDomain) {
          throw new ConflictError(
            'Another organization with the same domain already exists.',
          )
        }
      }

      let organization: { id: string }
      try {
        organization = await prisma.$transaction(async (tx) => {
          const org = await tx.organization.create({
            data: {
              name,
              slug,
              domain,
              shouldAttachUsersByDomain: shouldAttachUsersByDomain ?? false,
              ownerId: userId,
            },
          })

          await tx.member.create({
            data: { organizationId: org.id, userId, role: 'ADMIN' },
          })

          return org
        })
      } catch (err) {
        const e = err as { code?: string; meta?: { target?: string[] } }
        if (e?.code === 'P2002') {
          if (e.meta?.target?.includes('slug')) {
            throw new ConflictError(
              'Another organization with the same name (slug) already exists.',
            )
          }
          if (e.meta?.target?.includes('domain')) {
            throw new ConflictError(
              'Another organization with the same domain already exists.',
            )
          }
        }
        throw err
      }

      return reply.status(201).send({ organizationId: organization.id })
    },
  )
}

export const createOrgRoute = fp(plugin)
