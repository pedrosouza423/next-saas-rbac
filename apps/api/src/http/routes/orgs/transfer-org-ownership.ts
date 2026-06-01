import { defineAbilityFor, organizationCan, organizationSchema, userSchema } from '@saas/auth'
import fp from 'fastify-plugin'
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { z } from 'zod/v4'

import { prisma } from '../../../lib/prisma.js'
import { BadRequestError } from '../../errors/bad-request-error.js'
import { ForbiddenError } from '../../errors/forbidden-error.js'

const plugin: FastifyPluginAsyncZod = async (app) => {
  app.patch(
    '/organizations/:slug/owner',
    {
      schema: {
        tags: ['orgs'],
        summary: 'Transfer organization ownership',
        security: [{ bearerAuth: [] }],
        params: z.object({ slug: z.string() }),
        body: z.object({ transferToUserId: z.string() }),
        response: {
          204: z.object({}),
        },
      },
    },
    async (request, reply) => {
      const { slug } = request.params
      const { transferToUserId } = request.body
      const { organization, membership } = await request.getUserMembership(slug)

      const ability = defineAbilityFor(
        userSchema.parse({ id: membership.userId, role: membership.role }),
      )
      const orgSubject = organizationSchema.parse(organization)

      if (!organizationCan(ability, 'transfer_ownership', orgSubject)) {
        throw new ForbiddenError(
          'You are not allowed to transfer ownership of this organization.',
        )
      }

      if (transferToUserId === membership.userId) {
        throw new BadRequestError('You cannot transfer ownership to yourself.')
      }

      const targetMember = await prisma.member.findUnique({
        where: {
          organizationId_userId: {
            organizationId: organization.id,
            userId: transferToUserId,
          },
        },
      })

      if (!targetMember) {
        throw new BadRequestError(
          'Target user is not a member of this organization.',
        )
      }

      await prisma.$transaction([
        prisma.organization.update({
          where: { id: organization.id },
          data: { ownerId: transferToUserId },
        }),
        prisma.member.update({
          where: {
            organizationId_userId: {
              organizationId: organization.id,
              userId: transferToUserId,
            },
          },
          data: { role: 'ADMIN' },
        }),
      ])

      return reply.status(204).send({})
    },
  )
}

export const transferOrgOwnershipRoute = fp(plugin)
