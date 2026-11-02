import { z } from 'zod'
import {
  type AiSkipReason,
  COLLECTION_COLORS,
  type CollectionColor,
  type LinkStatus,
  type LinkType,
} from './constants'

/** Most changes one push may carry; the client sends the rest in the next push. */
export const SYNC_PUSH_LIMIT = 100
/** Most rows one pull returns; `hasMore` tells the client to pull again. */
export const SYNC_PULL_LIMIT = 500
/**
 * A link still queued/processing this long after its last change is stuck (its job was
 * lost or its worker died for good): the app stops waiting and offers Retry.
 */
export const STUCK_AFTER_MS = 10 * 60 * 1000

export function isLinkBusy(l: { status: LinkStatus }) {
  return l.status === 'queued' || l.status === 'processing'
}

export function isLinkStuck(l: { status: LinkStatus; updatedAt: string }, now = Date.now()) {
  return isLinkBusy(l) && now - new Date(l.updatedAt).getTime() > STUCK_AFTER_MS
}

const id = z.uuid()
const collectionName = z.string().trim().min(1).max(60)

/**
 * One change from the device. IDs are made on the device, so sending the same change
 * twice (a retry after a dropped response) never creates a second row.
 */
export const syncChangeSchema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('link.create'),
    id,
    url: z.string().trim().min(1).max(2048),
    readLater: z.boolean().default(false),
    savedAt: z.iso.datetime(),
  }),
  z.object({
    kind: z.literal('link.update'),
    id,
    patch: z
      .object({
        readLater: z.boolean(),
        collectionId: id.nullable(),
        note: z.string().max(5000).nullable(),
        title: z.string().trim().min(1).max(300),
      })
      .partial(),
  }),
  z.object({ kind: z.literal('link.retry'), id }),
  z.object({ kind: z.literal('link.delete'), id }),
  z.object({
    kind: z.literal('collection.create'),
    id,
    name: collectionName,
    color: z.enum(COLLECTION_COLORS).default('violet'),
  }),
  z.object({
    kind: z.literal('collection.update'),
    id,
    patch: z
      .object({
        name: collectionName,
        color: z.enum(COLLECTION_COLORS),
        pinned: z.boolean(),
        description: z.string().max(300).nullable(),
      })
      .partial(),
  }),
  z.object({ kind: z.literal('collection.delete'), id }),
])
export type SyncChange = z.input<typeof syncChangeSchema>

export const syncPushSchema = z.object({
  changes: z.array(syncChangeSchema).min(1).max(SYNC_PUSH_LIMIT),
})

/**
 * What happened to each change. `duplicateOf` means the link was already in the library
 * (same normalised URL): the device should drop its copy and use that id.
 */
export type SyncResult =
  | { id: string; ok: true; duplicateOf?: string }
  | { id: string; ok: false; error: 'invalid_url' | 'not_found' | 'name_taken' | 'not_allowed' }

export type SyncLink = {
  id: string
  url: string
  site: string | null
  title: string | null
  description: string | null
  imageUrl: string | null
  type: LinkType
  summary: string | null
  tags: string[]
  collectionId: string | null
  note: string | null
  status: LinkStatus
  aiSkipReason: AiSkipReason | null
  aiSuggestedCollection: string | null
  readLater: boolean
  readMinutes: number | null
  failReason: string | null
  savedAt: string
  processedAt: string | null
  /** Last change on the server; tells a stuck link from one still being read. */
  updatedAt: string
  serverVersion: number
  deletedAt: string | null
}

export type SyncCollection = {
  id: string
  name: string
  color: CollectionColor
  description: string | null
  pinned: boolean
  aiCreated: boolean
  serverVersion: number
  deletedAt: string | null
}

/** Today's AI sorts for the signed-in user, sent with every pull. */
export type AiUsage = { used: number; limit: number; enabled: boolean }

export type SyncPullResponse = {
  links: SyncLink[]
  collections: SyncCollection[]
  /** Pass back as `since` on the next pull. */
  cursor: number
  hasMore: boolean
  usage: AiUsage
}
