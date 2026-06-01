import type { FastifyError, FastifyInstance } from 'fastify'
import { hasZodFastifySchemaValidationErrors } from 'fastify-type-provider-zod'

import { BadRequestError } from './errors/bad-request-error.js'
import { ConflictError } from './errors/conflict-error.js'
import { ForbiddenError } from './errors/forbidden-error.js'
import { NotFoundError } from './errors/not-found-error.js'
import { UnauthorizedError } from './errors/unauthorized-error.js'

export function errorHandler(app: FastifyInstance) {
  app.setErrorHandler((error: FastifyError, _request, reply) => {
    if (hasZodFastifySchemaValidationErrors(error)) {
      return reply.status(400).send({
        message: 'Validation error.',
        errors: error.validation,
      })
    }

    if (error.code === 'FST_ERR_VALIDATION') {
      return reply.status(400).send({ message: 'Validation error.' })
    }

    if (error instanceof BadRequestError) {
      return reply.status(400).send({ message: error.message })
    }

    if (error instanceof UnauthorizedError) {
      return reply.status(401).send({ message: error.message })
    }

    if (error instanceof ForbiddenError) {
      return reply.status(403).send({ message: error.message })
    }

    if (error instanceof NotFoundError) {
      return reply.status(404).send({ message: error.message })
    }

    if (error instanceof ConflictError) {
      return reply.status(409).send({ message: error.message })
    }

    console.error(error)

    return reply.status(500).send({ message: 'Internal server error.' })
  })
}
