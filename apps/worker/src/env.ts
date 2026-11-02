import { resolve } from 'node:path'
import { config } from 'dotenv'
import { z } from 'zod'

// One .env at the repo root for local dev. On Railway, variables come from the dashboard.
config({ path: resolve(import.meta.dirname, '../../../.env'), quiet: true })

export const env = z
  .object({
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
    DATABASE_URL: z.string().url(),
    SENTRY_DSN: z.string().optional(),
    // Required to process links (checked at worker start); scripts like ping don't need it.
    ANTHROPIC_API_KEY: z.string().optional(),
    // Cloudflare R2 for page copies. Optional: without it, links are still processed,
    // just without a stored page copy.
    R2_ACCOUNT_ID: z.string().optional(),
    R2_ACCESS_KEY_ID: z.string().optional(),
    R2_SECRET_ACCESS_KEY: z.string().optional(),
    R2_BUCKET: z.string().optional(),
  })
  .parse(process.env)
