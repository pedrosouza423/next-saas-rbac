import fp from 'fastify-plugin'
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { z } from 'zod/v4'

import { prisma } from '../../../lib/prisma.js'
import { ConflictError } from '../../errors/conflict-error.js'
import { ForbiddenError } from '../../errors/forbidden-error.js'
import { buildUserAbility } from '../../lib/build-ability.js'

const plugin: FastifyPluginAsyncZod = async (app) => {
  app.post(
    '/organizations/:slug/invites',
    {
      schema: {
        tags: ['invites'],
        summary: 'Create an invite for an organization',
        security: [{ bearerAuth: [] }],
        params: z.object({ slug: z.string() }),
        body: z.object({
          email: z.string().email(),
          role: z.enum(['ADMIN', 'MEMBER', 'BILLING']),
        }),
        response: {
          201: z.object({ inviteId: z.string() }),
        },
      },
    },
    async (request, reply) => {
      const { slug } = request.params
      const { email, role } = request.body
      const { organization, membership } = await request.getUserMembership(slug)

      const ability = buildUserAbility(membership)

      if (!ability.can('invite', 'User')) {
        throw new ForbiddenError('You are not allowed to create invites.')
      }

      if (membership.role === 'MEMBER' && role === 'BILLING') {
        throw new ForbiddenError('Members cannot invite users with the BILLING role.')
      }

      const existingMember = await prisma.member.findFirst({
        where: { organizationId: organization.id, user: { email } },
      })

      if (existingMember) {
        throw new ConflictError(
          'A member with this email already belongs to the organization.',
        )
      }

      let invite: { id: string }
      try {
        invite = await prisma.invite.create({
          data: {
            email,
            role,
            organizationId: organization.id,
            authorId: membership.userId,
          },
        })
      } catch (err) {
        const e = err as { code?: string }
        if (e?.code === 'P2002') {
          throw new ConflictError(
            'A pending invite for this email already exists.',
          )
        }
        throw err
      }

      return reply.status(201).send({ inviteId: invite.id })
    },
  )
}

export const createInviteRoute = fp(plugin)
