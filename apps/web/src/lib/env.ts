import { z } from 'zod'

// Server-only variables, validated on first use so a missing one fails loudly.
const serverSchema = z.object({
  DATABASE_URL: z.string().url(),
})

let cached: z.infer<typeof serverSchema> | undefined

export function serverEnv() {
  cached ??= serverSchema.parse(process.env)
  return cached
}
