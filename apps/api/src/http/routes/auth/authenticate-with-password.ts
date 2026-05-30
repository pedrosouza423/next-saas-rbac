import bcrypt from 'bcryptjs'
import type { FastifyInstance } from 'fastify'
import fp from 'fastify-plugin'
import { z } from 'zod/v4'

import { BadRequestError } from '../../errors/bad-request-error.js'
import { prisma } from '../../../lib/prisma.js'

export const authenticateWithPasswordRoute = fp(async (app: FastifyInstance) => {
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
})
