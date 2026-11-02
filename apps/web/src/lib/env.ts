import { z } from 'zod'

// Server-only variables, validated on first use so a missing one fails loudly.
const serverSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    DATABASE_URL: z.string().url(),
    BETTER_AUTH_SECRET: z.string().min(32, 'BETTER_AUTH_SECRET must be at least 32 characters'),
    BETTER_AUTH_URL: z.string().url(),
    RESEND_API_KEY: z.string().optional(),
    EMAIL_FROM: z.string().optional(),
  })
  // In development, emails without a key are printed to the log. In production that would
  // put live verification and reset links in the server logs, so both are required.
  .superRefine((env, ctx) => {
    if (env.NODE_ENV !== 'production') return
    for (const key of ['RESEND_API_KEY', 'EMAIL_FROM'] as const) {
      if (!env[key])
        ctx.addIssue({ code: 'custom', path: [key], message: `${key} is required in production` })
    }
  })
  .transform((env) => ({ ...env, EMAIL_FROM: env.EMAIL_FROM || 'Keepmint <hello@keepmint.store>' }))

let cached: z.infer<typeof serverSchema> | undefined

export function serverEnv() {
  cached ??= serverSchema.parse(process.env)
  return cached
}
