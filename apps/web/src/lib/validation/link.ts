import { parseLinkInput } from '@keepmint/core'
import { z } from 'zod'

export const LINK_INVALID =
  'That doesn’t look like a link yet. Try something like youtube.com/watch?v=…'

export const linkUrl = z
  .string()
  .trim()
  .min(1, { message: 'Paste a link to save.', abort: true })
  .max(2048, { message: 'That link is too long.', abort: true })
  .refine((v) => parseLinkInput(v) !== null, LINK_INVALID)

export const addLinkSchema = z.object({ url: linkUrl, readLater: z.boolean() })
