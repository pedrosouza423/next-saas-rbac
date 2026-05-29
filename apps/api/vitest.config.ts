import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    env: {
      DATABASE_URL: 'postgresql://localhost:5432/test',
      JWT_SECRET: 'test-secret-key-at-least-8-chars',
    },
  },
})
