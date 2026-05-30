import { describe, expect, it, vi } from 'vitest'
import { z } from 'zod/v4'

import { BadRequestError } from '../src/http/errors/bad-request-error.js'
import { ConflictError } from '../src/http/errors/conflict-error.js'
import { NotFoundError } from '../src/http/errors/not-found-error.js'
import { UnauthorizedError } from '../src/http/errors/unauthorized-error.js'
import { createTestApp } from './create-test-app.js'

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

  it('returns 409 for ConflictError', async () => {
    const app = await createTestApp()

    app.get('/test-conflict', {
      handler: async () => {
        throw new ConflictError('resource already exists')
      },
    })

    await app.ready()

    const response = await app.inject({
      method: 'GET',
      url: '/test-conflict',
    })

    expect(response.statusCode).toBe(409)
    expect(response.json().message).toBe('resource already exists')
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
