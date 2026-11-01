import { z } from 'zod'
import { LINK_TYPES } from './constants'

/** What one Claude call returns for a link. Validated before anything is saved. */
export const linkAiOutputSchema = z.object({
  summary: z.string().min(1).max(320),
  tags: z.array(z.string().min(1).max(32)).max(5),
  type: z.enum(LINK_TYPES),
  collection: z.object({
    existingId: z.string().uuid().nullable(),
    newName: z.string().min(1).max(60).nullable(),
  }),
  confidence: z.number().min(0).max(1),
  readMinutes: z.number().int().min(1).max(600).nullable(),
})
export type LinkAiOutput = z.infer<typeof linkAiOutputSchema>
