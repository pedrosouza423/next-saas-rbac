import type { FastifyInstance } from 'fastify'
import { hasZodFastifySchemaValidationErrors } from 'fastify-type-provider-zod'

import { BadRequestError } from './errors/bad-request-error.js'
import { NotFoundError } from './errors/not-found-error.js'
import { UnauthorizedError } from './errors/unauthorized-error.js'

export function errorHandler(app: FastifyInstance) {
  app.setErrorHandler((error, _request, reply) => {
    if (hasZodFastifySchemaValidationErrors(error)) {
      return reply.status(400).send({
        message: 'Validation error.',
        errors: error.validation,
      })
    }

    // Fastify emits FST_ERR_VALIDATION when the validator itself throws
    // (e.g. fastify-type-provider-zod compat issues with Zod v4 where
    // .errors does not exist on ZodError — only .issues does).
    // Treat any validation-context error as a 400.
    if ('code' in error && error.code === 'FST_ERR_VALIDATION') {
      return reply.status(400).send({ message: 'Validation error.' })
    }

    if (error instanceof BadRequestError) {
      return reply.status(400).send({ message: error.message })
    }

    if (error instanceof UnauthorizedError) {
      return reply.status(401).send({ message: error.message })
    }

    if (error instanceof NotFoundError) {
      return reply.status(404).send({ message: error.message })
    }

    console.error(error)

    return reply.status(500).send({ message: 'Internal server error.' })
  })
}
