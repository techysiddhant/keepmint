import { z } from 'zod'
import { LINK_TYPES, type LinkType } from './constants'

/**
 * What one Claude call returns for a link. Sent to the API as a structured-output schema,
 * which can't carry length or range limits, so `cleanLinkAiOutput` enforces those after.
 */
export const linkAiOutputSchema = z.object({
  summary: z.string().describe('At most two short sentences, plain text'),
  tags: z.array(z.string()).describe('Up to 5 short lower-case topic tags'),
  type: z.enum(LINK_TYPES),
  collection: z
    .string()
    .nullable()
    .describe('Name of the best collection: an existing one, or a short new name'),
  newCollection: z.boolean().describe('True when `collection` is not in the existing list'),
  confidence: z.number().describe('0 to 1: how sure you are about the collection'),
  readMinutes: z.number().int().nullable().describe('Minutes to read or watch, if known'),
})
export type LinkAiOutput = z.infer<typeof linkAiOutputSchema>

/** The small call used on a shared-cache hit: only the collection is chosen. */
export const collectionPickSchema = linkAiOutputSchema.pick({
  collection: true,
  newCollection: true,
  confidence: true,
})
export type CollectionPick = z.infer<typeof collectionPickSchema>

export type CleanLinkAiOutput = {
  summary: string
  tags: string[]
  type: LinkType
  collection: string | null
  newCollection: boolean
  confidence: number
  readMinutes: number | null
}

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n))

export function cleanCollectionName(name: string | null | undefined): string | null {
  const value = name?.replace(/\s+/g, ' ').trim().slice(0, 60)
  return value && value.toLowerCase() !== 'unsorted' ? value : null
}

/** Applies the limits the API schema can't express (lengths, counts, ranges). */
export function cleanLinkAiOutput(out: LinkAiOutput): CleanLinkAiOutput {
  const tags = [
    ...new Set(
      out.tags
        .map((t) => t.toLowerCase().replace(/^#/, '').replace(/\s+/g, ' ').trim().slice(0, 32))
        .filter(Boolean),
    ),
  ].slice(0, 5)
  const collection = cleanCollectionName(out.collection)
  return {
    summary: out.summary.replace(/\s+/g, ' ').trim().slice(0, 320),
    tags,
    type: out.type,
    collection,
    // "New" only makes sense with a usable name.
    newCollection: collection !== null && out.newCollection,
    confidence: Number.isFinite(out.confidence) ? clamp(out.confidence, 0, 1) : 0,
    readMinutes:
      out.readMinutes && out.readMinutes > 0 ? clamp(Math.round(out.readMinutes), 1, 600) : null,
  }
}

/** "Let AI fill it": a description for a new collection plus words to find its links by. */
export const collectionFillSchema = z.object({
  description: z.string().describe('One short sentence: what belongs in this collection'),
  keywords: z
    .array(z.string())
    .describe('Up to 8 single lower-case words that links in this collection would contain'),
})
export type CollectionFill = z.infer<typeof collectionFillSchema>
