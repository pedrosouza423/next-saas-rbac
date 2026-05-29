import fastifyCors from '@fastify/cors'
import fastifySwagger from '@fastify/swagger'
import fastifySwaggerUi from '@fastify/swagger-ui'
import fastify from 'fastify'
import {
  jsonSchemaTransform,
  serializerCompiler,
  validatorCompiler,
  type ZodTypeProvider,
} from 'fastify-type-provider-zod'
import { z } from 'zod/v4'

import { env } from './env.js'
import { errorHandler } from './http/error-handler.js'
import { prisma } from './lib/prisma.js'

const app = fastify({ logger: true }).withTypeProvider<ZodTypeProvider>()

app.setValidatorCompiler(validatorCompiler)
app.setSerializerCompiler(serializerCompiler)
errorHandler(app)

await app.register(fastifySwagger, {
  openapi: {
    info: {
      title: 'Next.js SaaS + RBAC',
      description: 'REST API for Next.js SaaS with RBAC',
      version: '1.0.0',
    },
  },
  transform: jsonSchemaTransform,
})

await app.register(fastifySwaggerUi, {
  routePrefix: '/docs',
})

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

await app.listen({ port: env.PORT, host: '0.0.0.0' })
console.log(`HTTP server running on http://localhost:${env.PORT}`)
