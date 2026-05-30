import bcrypt from 'bcryptjs'
import type { FastifyInstance } from 'fastify'
import fp from 'fastify-plugin'
import { z } from 'zod/v4'

import { BadRequestError } from '../../errors/bad-request-error.js'
import { prisma } from '../../../lib/prisma.js'

export const resetPasswordRoute = fp(async (app: FastifyInstance) => {
  app.post(
    '/password/reset',
    {
      schema: {
        tags: ['auth'],
        summary: 'Reset password using recovery token',
        body: z.object({
          code: z.string().uuid(),
          password: z.string().min(6),
        }),
        response: { 204: z.object({}) },
      },
    },
    async (request, reply) => {
      const { code, password } = request.body

      const token = await prisma.token.findUnique({ where: { id: code } })

      if (!token) {
        throw new BadRequestError('Invalid token.')
      }

      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)
      if (token.createdAt < oneHourAgo) {
        throw new BadRequestError('Token expired.')
      }

      const passwordHash = await bcrypt.hash(password, 6)

      await prisma.$transaction([
        prisma.user.update({
          where: { id: token.userId },
          data: { passwordHash },
        }),
        prisma.token.delete({ where: { id: token.id } }),
      ])

      return reply.status(204).send({})
    },
  )
})
