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
