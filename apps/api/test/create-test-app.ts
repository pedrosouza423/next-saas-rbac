import fastify from 'fastify'
import {
  serializerCompiler,
  validatorCompiler,
} from 'fastify-type-provider-zod'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'

import { errorHandler } from '../src/http/error-handler.js'
import { auth } from '../src/http/middlewares/auth.js'

/**
 * Creates a Fastify test instance with error handler and auth middleware
 * registered, but NOT yet ready. Call `await app.ready()` after adding
 * any test routes.
 */
export async function createTestApp() {
  const app = fastify().withTypeProvider<ZodTypeProvider>()

  app.setValidatorCompiler(validatorCompiler)
  app.setSerializerCompiler(serializerCompiler)
  errorHandler(app)

  await app.register(auth)

  return app
}
