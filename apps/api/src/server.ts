import fastifyCors from '@fastify/cors'
import fastify from 'fastify'
import {
  serializerCompiler,
  validatorCompiler,
  type ZodTypeProvider,
} from 'fastify-type-provider-zod'
import { z } from 'zod/v4'

import { env } from './env.js'
import { prisma } from './lib/prisma.js'

const app = fastify({ logger: true }).withTypeProvider<ZodTypeProvider>()

app.setValidatorCompiler(validatorCompiler)
app.setSerializerCompiler(serializerCompiler)

await app.register(fastifyCors, { origin: true })

app.route({
  method: 'GET',
  url: '/health',
  schema: {
    response: {
      200: z.object({ status: z.literal('ok'), db: z.literal('ok') }),
    },
  },
  handler: async () => {
    await prisma.$queryRaw`SELECT 1`
    return { status: 'ok' as const, db: 'ok' as const }
  },
})

app.listen({ port: env.PORT, host: '0.0.0.0' }).then(() => {
  console.log(`HTTP server running on http://localhost:${env.PORT}`)
})
