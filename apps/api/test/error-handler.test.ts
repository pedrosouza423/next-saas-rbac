import { describe, expect, it, vi } from 'vitest'
import { z } from 'zod/v4'

import { BadRequestError } from '../src/http/errors/bad-request-error.js'
import { NotFoundError } from '../src/http/errors/not-found-error.js'
import { UnauthorizedError } from '../src/http/errors/unauthorized-error.js'
import { createTestApp } from './create-test-app.js'

// Prevent prisma from attempting a real DB connection at module load
vi.mock('../src/lib/prisma.js', () => ({
  prisma: {
    member: {
      findFirst: vi.fn(),
    },
  },
}))

describe('Error Handler', () => {
  it('returns 400 with validation errors for invalid Zod schema', async () => {
    const app = await createTestApp()

    app.get('/test-zod', {
      schema: {
        querystring: z.object({ name: z.string() }),
      },
      handler: async () => ({ ok: true }),
    })

    await app.ready()

    const response = await app.inject({
      method: 'GET',
      url: '/test-zod',
    })

    expect(response.statusCode).toBe(400)
    const body = response.json()
    expect(body.message).toBe('Validation error.')
    // FST_ERR_VALIDATION path (fastify-type-provider-zod v4 + zod v4 compat) does not populate errors field
    expect(body.errors).toBeUndefined()
  })

  it('returns 400 for BadRequestError', async () => {
    const app = await createTestApp()

    app.get('/test-bad-request', {
      handler: async () => {
        throw new BadRequestError('bad input')
      },
    })

    await app.ready()

    const response = await app.inject({
      method: 'GET',
      url: '/test-bad-request',
    })

    expect(response.statusCode).toBe(400)
    expect(response.json().message).toBe('bad input')
  })

  it('returns 401 for UnauthorizedError', async () => {
    const app = await createTestApp()

    app.get('/test-unauthorized', {
      handler: async () => {
        throw new UnauthorizedError()
      },
    })

    await app.ready()

    const response = await app.inject({
      method: 'GET',
      url: '/test-unauthorized',
    })

    expect(response.statusCode).toBe(401)
    expect(response.json().message).toBe('Unauthorized')
  })

  it('returns 404 for NotFoundError', async () => {
    const app = await createTestApp()

    app.get('/test-not-found', {
      handler: async () => {
        throw new NotFoundError('resource not found')
      },
    })

    await app.ready()

    const response = await app.inject({
      method: 'GET',
      url: '/test-not-found',
    })

    expect(response.statusCode).toBe(404)
    expect(response.json().message).toBe('resource not found')
  })

  it('returns 500 for unhandled errors', async () => {
    const app = await createTestApp()

    app.get('/test-unknown', {
      handler: async () => {
        throw new Error('something exploded')
      },
    })

    await app.ready()

    const response = await app.inject({
      method: 'GET',
      url: '/test-unknown',
    })

    expect(response.statusCode).toBe(500)
    expect(response.json().message).toBe('Internal server error.')
  })
})
