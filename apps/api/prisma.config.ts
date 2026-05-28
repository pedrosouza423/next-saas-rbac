import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { defineConfig } from 'prisma/config'

// Prisma 7 skips automatic .env loading when prisma.config.ts is present.
// We load it manually so DATABASE_URL is available for migrate/generate commands.
const envPath = resolve(import.meta.dirname, '.env')
try {
  for (const line of readFileSync(envPath, 'utf-8').split(/\r?\n/)) {
    if (!line || line.startsWith('#')) continue
    const eqIdx = line.indexOf('=')
    if (eqIdx === -1) continue
    const key = line.slice(0, eqIdx).trim()
    const val = line.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, '')
    if (key && !process.env[key]) process.env[key] = val
  }
} catch {}

export default defineConfig({
  datasource: {
    url: process.env.DATABASE_URL!,
  },
})
