import { resolve } from 'node:path'
import { config } from 'dotenv'
import { z } from 'zod'

// One .env at the repo root for local dev. On Railway, variables come from the dashboard.
config({ path: resolve(import.meta.dirname, '../../../.env'), quiet: true })

export const env = z
  .object({
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    DATABASE_URL: z.string().url(),
    SENTRY_DSN: z.string().optional(),
    // Required from Phase 2, when the worker starts calling Claude.
    ANTHROPIC_API_KEY: z.string().optional(),
  })
  .parse(process.env)
