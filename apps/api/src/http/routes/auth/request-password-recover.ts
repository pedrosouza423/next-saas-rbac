import type { FastifyInstance } from 'fastify'
import fp from 'fastify-plugin'
import { z } from 'zod/v4'

import { prisma } from '../../../lib/prisma.js'

export const requestPasswordRecoverRoute = fp(async (app: FastifyInstance) => {
  app.post(
    '/password/recover',
    {
      schema: {
        tags: ['auth'],
        summary: 'Request password recovery token',
        body: z.object({ email: z.email() }),
        response: { 201: z.object({}) },
      },
    },
    async (request, reply) => {
      const { email } = request.body

      const user = await prisma.user.findUnique({ where: { email } })

      if (user) {
        const token = await prisma.token.create({
          data: { type: 'PASSWORD_RECOVER', userId: user.id },
        })
        console.log('Password recover token:', token.id)
      }

      return reply.status(201).send({})
    },
  )
})
