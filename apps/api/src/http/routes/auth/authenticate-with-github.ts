import fp from 'fastify-plugin'
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { z } from 'zod/v4'

import { getGithubUserData } from '../../lib/github.js'
import { prisma } from '../../../lib/prisma.js'

const plugin: FastifyPluginAsyncZod = async (app) => {
  app.post(
    '/sessions/github',
    {
      schema: {
        tags: ['auth'],
        summary: 'Authenticate with GitHub OAuth',
        body: z.object({
          code: z.string(),
        }),
        response: {
          200: z.object({ token: z.string() }),
        },
      },
    },
    async (request, reply) => {
      const { code } = request.body

      const { githubId, name, email, avatarUrl } = await getGithubUserData(code)

      let user = await prisma.user.findFirst({
        where: {
          accounts: {
            some: { provider: 'GITHUB', providerAccountId: githubId },
          },
        },
      })

      if (!user) {
        const existingUser = await prisma.user.findUnique({ where: { email } })

        if (existingUser) {
          await prisma.account.create({
            data: {
              provider: 'GITHUB',
              providerAccountId: githubId,
              userId: existingUser.id,
            },
          })
          user = existingUser
        } else {
          user = await prisma.$transaction(async (tx) => {
            const newUser = await tx.user.create({
              data: { name, email, avatarUrl },
            })

            await tx.account.create({
              data: {
                provider: 'GITHUB',
                providerAccountId: githubId,
                userId: newUser.id,
              },
            })

            const emailDomain = email.split('@').at(1)
            if (emailDomain) {
              const org = await tx.organization.findFirst({
                where: { shouldAttachUsersByDomain: true, domain: emailDomain },
              })
              if (org) {
                await tx.member.create({
                  data: {
                    userId: newUser.id,
                    organizationId: org.id,
                    role: 'MEMBER',
                  },
                })
              }
            }

            return newUser
          })
        }
      }

      const token = app.jwt.sign({ sub: user.id }, { expiresIn: '7d' })

      return reply.status(200).send({ token })
    },
  )
}

export const authenticateWithGithubRoute = fp(plugin)
