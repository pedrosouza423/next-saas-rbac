import bcrypt from 'bcryptjs'
import fp from 'fastify-plugin'
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { z } from 'zod/v4'

import { BCRYPT_ROUNDS } from '../../../lib/constants.js'
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

      const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS)

      const user = await prisma.$transaction(async (tx) => {
        const newUser = await tx.user.create({
          data: { name, email, passwordHash },
        })

        const emailDomain = email.split('@').at(1)
        if (emailDomain) {
          const org = await tx.organization.findFirst({
            where: { shouldAttachUsersByDomain: true, domain: emailDomain },
          })

          if (org) {
            await tx.member.create({
              data: { userId: newUser.id, organizationId: org.id, role: 'MEMBER' },
            })
          }
        }

        return newUser
      })

      return reply.status(201).send({ userId: user.id })
    },
  )
}

export const createAccountRoute = fp(plugin)
