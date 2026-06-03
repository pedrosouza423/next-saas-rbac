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
  app.delete(
    '/organizations/:slug/members/:memberId',
    {
      schema: {
        tags: ['members'],
        summary: 'Remove a member from an organization',
        security: [{ bearerAuth: [] }],
        params: z.object({ slug: z.string(), memberId: z.string() }),
        response: {
          204: z.object({}),
        },
      },
    },
    async (request, reply) => {
      const { slug, memberId } = request.params
      const { organization, membership } = await request.getUserMembership(slug)

      const ability = buildUserAbility(membership)

      // Fast path: reject roles with no delete User rule at all (e.g. BILLING).
      // Roles with a conditional rule (MEMBER: self-only) pass here and are
      // checked against the target instance below via userCan.
      if (!ability.can('delete', 'User')) {
        throw new ForbiddenError('You are not allowed to remove this member.')
      }

      const targetMember = await prisma.member.findFirst({
        where: { id: memberId, organizationId: organization.id },
        include: { organization: { select: { ownerId: true } } },
      })

      if (!targetMember) {
        throw new NotFoundError('Member not found.')
      }

      if (targetMember.userId === targetMember.organization.ownerId) {
        throw new BadRequestError('You cannot remove the organization owner.')
      }

      const targetUserSubject = userSchema.parse({
        id: targetMember.userId,
        role: targetMember.role,
      })

      if (!userCan(ability, 'delete', targetUserSubject)) {
        throw new ForbiddenError('You are not allowed to remove this member.')
      }

      await prisma.member.delete({ where: { id: targetMember.id } })

      return reply.status(204).send({})
    },
  )
}

export const deleteMemberRoute = fp(plugin)
