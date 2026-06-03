import { userCan, userSchema } from '@saas/auth'
import fp from 'fastify-plugin'
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { z } from 'zod/v4'

import { prisma } from '../../../lib/prisma.js'
import { BadRequestError } from '../../errors/bad-request-error.js'
import { ForbiddenError } from '../../errors/forbidden-error.js'
import { NotFoundError } from '../../errors/not-found-error.js'
import { buildUserAbility } from '../../lib/build-ability.js'

const plugin: FastifyPluginAsyncZod = async (app) => {
  app.put(
    '/organizations/:slug/members/:memberId',
    {
      schema: {
        tags: ['members'],
        summary: 'Update a member role',
        security: [{ bearerAuth: [] }],
        params: z.object({ slug: z.string(), memberId: z.string() }),
        body: z.object({
          role: z.enum(['ADMIN', 'MEMBER', 'BILLING']),
        }),
        response: {
          204: z.object({}),
        },
      },
    },
    async (request, reply) => {
      const { slug, memberId } = request.params
      const { role } = request.body
      const { organization, membership } = await request.getUserMembership(slug)

      const ability = buildUserAbility(membership)

      if (!ability.can('update', 'User')) {
        throw new ForbiddenError('You are not allowed to update this member.')
      }

      const targetMember = await prisma.member.findFirst({
        where: { id: memberId, organizationId: organization.id },
        include: { organization: { select: { ownerId: true } } },
      })

      if (!targetMember) {
        throw new NotFoundError('Member not found.')
      }

      if (targetMember.userId === targetMember.organization.ownerId) {
        throw new BadRequestError("You cannot change the organization owner's role.")
      }

      const targetUserSubject = userSchema.parse({
        id: targetMember.userId,
        role: targetMember.role,
      })

      if (!userCan(ability, 'update', targetUserSubject)) {
        throw new ForbiddenError('You are not allowed to update this member.')
      }

      await prisma.member.update({
        where: { id: targetMember.id },
        data: { role },
      })

      return reply.status(204).send({})
    },
  )
}

export const updateMemberRoleRoute = fp(plugin)
