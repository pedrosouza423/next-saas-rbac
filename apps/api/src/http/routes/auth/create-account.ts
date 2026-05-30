import bcrypt from 'bcryptjs'
import fp from 'fastify-plugin'
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { z } from 'zod/v4'

import { prisma } from '../../../lib/prisma.js'
import { ConflictError } from '../../errors/conflict-error.js'

const plugin: FastifyPluginAsyncZod = async (app) => {
  app.post(
    '/users',
    {
      schema: {
        tags: ['auth'],
        summary: 'Create a new account',
        body: z.object({
          name: z.string(),
          email: z.email(),
          password: z.string().min(6),
        }),
        response: {
          201: z.object({ userId: z.string() }),
        },
      },
    },
    async (request, reply) => {
      const { name, email, password } = request.body

      const existingUser = await prisma.user.findUnique({ where: { email } })
      if (existingUser) {
        throw new ConflictError('User with same email already exists.')
      }

      const passwordHash = await bcrypt.hash(password, 6)
      const user = await prisma.user.create({
        data: { name, email, passwordHash },
      })

      const emailDomain = email.split('@').at(1)
      if (emailDomain) {
        const org = await prisma.organization.findFirst({
          where: { shouldAttachUsersByDomain: true, domain: emailDomain },
        })

        if (org) {
          await prisma.member.create({
            data: { userId: user.id, organizationId: org.id, role: 'MEMBER' },
          })
        }
      }

      return reply.status(201).send({ userId: user.id })
    },
  )
}

export const createAccountRoute = fp(plugin)
