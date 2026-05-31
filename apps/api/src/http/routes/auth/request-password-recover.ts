import fp from 'fastify-plugin'
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { z } from 'zod/v4'

import { prisma } from '../../../lib/prisma.js'

const plugin: FastifyPluginAsyncZod = async (app) => {
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
        await prisma.token.create({
          data: { type: 'PASSWORD_RECOVER', userId: user.id },
        })
      }

      return reply.status(201).send({})
    },
  )
}

export const requestPasswordRecoverRoute = fp(plugin)
