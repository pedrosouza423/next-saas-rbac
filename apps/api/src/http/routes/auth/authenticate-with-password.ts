import bcrypt from 'bcryptjs'
import fp from 'fastify-plugin'
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { z } from 'zod/v4'

import { prisma } from '../../../lib/prisma.js'
import { BadRequestError } from '../../errors/bad-request-error.js'

const plugin: FastifyPluginAsyncZod = async (app) => {
  app.post(
    '/sessions/password',
    {
      schema: {
        tags: ['auth'],
        summary: 'Authenticate with email and password',
        body: z.object({
          email: z.email(),
          password: z.string(),
        }),
        response: {
          200: z.object({ token: z.string() }),
        },
      },
    },
    async (request, reply) => {
      const { email, password } = request.body

      const user = await prisma.user.findUnique({ where: { email } })

      if (!user || !user.passwordHash) {
        throw new BadRequestError('Invalid credentials.')
      }

      const valid = await bcrypt.compare(password, user.passwordHash)
      if (!valid) {
        throw new BadRequestError('Invalid credentials.')
      }

      const token = app.jwt.sign({ sub: user.id }, { expiresIn: '7d' })

      return reply.status(200).send({ token })
    },
  )
}

export const authenticateWithPasswordRoute = fp(plugin)
