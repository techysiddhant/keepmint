import 'server-only'
import {
  type AiUsage,
  detectTypeFromHost,
  parseLinkInput,
  QUEUES,
  STUCK_AFTER_MS,
  SYNC_PULL_LIMIT,
  type SyncCollection,
  type SyncLink,
  type SyncPullResponse,
  type SyncResult,
  type syncChangeSchema,
  urlHash,
} from '@keepmint/core'
import {
  type AppSettings,
  aiUsedToday,
  collections,
  effectiveDailyLimit,
  getAppSettings,
  links,
  user,
} from '@keepmint/db'
import { and, asc, eq, gt, inArray, isNull, lt, or, sql } from 'drizzle-orm'
import { fromDrizzle } from 'pg-boss'
import type { z } from 'zod'
import { getDb } from './db'
import { getBoss } from './queue'

type Change = z.output<typeof syncChangeSchema>
type Db = ReturnType<typeof getDb>
type Tx = Parameters<Parameters<Db['transaction']>[0]>[0]

/** Postgres error code from a driver or drizzle-wrapped error. */
function pgCode(err: unknown): string | undefined {
  const e = err as { code?: string; cause?: { code?: string } }
  return e.code ?? e.cause?.code
}

/** Drops keys whose value is undefined, so "not sent" never becomes "set to null". */
function withoutUndefined<T extends Record<string, unknown>>(obj: T): Partial<T> {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined)) as Partial<T>
}

async function enqueueProcessLink(tx: Tx, linkId: string) {
  const boss = await getBoss()
  // Same transaction as the link row: either both exist or neither does.
  await boss.send(QUEUES.processLink, { linkId }, { db: fromDrizzle(tx, sql) })
}

async function createLink(
  userId: string,
  c: Extract<Change, { kind: 'link.create' }>,
): Promise<SyncResult> {
  const url = parseLinkInput(c.url)
  if (!url) return { id: c.id, ok: false, error: 'invalid_url' }
  const hash = await urlHash(url.href)
  const db = getDb()

  return db.transaction(async (tx) => {
    // A retried push: the row is already here.
    const [same] = await tx.select({ userId: links.userId }).from(links).where(eq(links.id, c.id))
    if (same) {
      return same.userId === userId
        ? { id: c.id, ok: true }
        : { id: c.id, ok: false, error: 'not_allowed' }
    }

    // Already in the library: merge instead of saving a second copy (no AI spent).
    const [dup] = await tx
      .select({ id: links.id, readLater: links.readLater })
      .from(links)
      .where(and(eq(links.userId, userId), eq(links.urlHash, hash), isNull(links.deletedAt)))
    if (dup) {
      if (c.readLater && !dup.readLater) {
        await tx
          .update(links)
          .set({ readLater: true, readLaterRank: Date.now() })
          .where(eq(links.id, dup.id))
      }
      return { id: c.id, ok: true, duplicateOf: dup.id }
    }

    const savedAt = new Date(c.savedAt)
    await tx.insert(links).values({
      id: c.id,
      userId,
      url: url.href,
      urlHash: hash,
      site: url.hostname.replace(/^www\./, ''),
      type: detectTypeFromHost(url) ?? 'article',
      status: 'queued',
      readLater: c.readLater,
      readLaterRank: c.readLater ? Date.now() : null,
      // Device clocks can be wrong; never accept a save time from the future.
      savedAt: savedAt.getTime() > Date.now() ? new Date() : savedAt,
    })
    await enqueueProcessLink(tx, c.id)
    return { id: c.id, ok: true }
  })
}

async function ownsLiveCollection(tx: Tx | Db, userId: string, id: string) {
  const [row] = await tx
    .select({ id: collections.id })
    .from(collections)
    .where(
      and(eq(collections.id, id), eq(collections.userId, userId), isNull(collections.deletedAt)),
    )
  return Boolean(row)
}

async function applyChange(userId: string, c: Change): Promise<SyncResult> {
  const db = getDb()
  const ownLink = and(eq(links.id, c.id), eq(links.userId, userId), isNull(links.deletedAt))
  const ownCollection = and(
    eq(collections.id, c.id),
    eq(collections.userId, userId),
    isNull(collections.deletedAt),
  )
  const notFound = { id: c.id, ok: false, error: 'not_found' } as const

  switch (c.kind) {
    case 'link.create':
      try {
        return await createLink(userId, c)
      } catch (err) {
        // Two pushes raced to save the same URL; the second now finds the first as a duplicate.
        if (pgCode(err) === '23505') return createLink(userId, c)
        throw err
      }

    case 'link.update': {
      const { collectionId, readLater, ...rest } = c.patch
      if (collectionId && !(await ownsLiveCollection(db, userId, collectionId))) return notFound
      const set = withoutUndefined({
        ...rest,
        collectionId,
        ...(readLater !== undefined
          ? { readLater, readLaterRank: readLater ? Date.now() : null }
          : {}),
      })
      // Nothing to change (drizzle refuses an empty SET): just report whether it exists.
      if (!Object.keys(set).length) {
        const [row] = await db.select({ id: links.id }).from(links).where(ownLink)
        return row ? { id: c.id, ok: true } : notFound
      }
      const rows = await db.update(links).set(set).where(ownLink).returning({ id: links.id })
      return rows.length ? { id: c.id, ok: true } : notFound
    }

    case 'link.retry':
      return db.transaction(async (tx) => {
        const rows = await tx
          .update(links)
          .set({ status: 'queued', attempts: 0, failReason: null, aiSkipReason: null })
          .where(
            and(
              ownLink,
              or(
                inArray(links.status, ['failed', 'no_ai']),
                // A stuck link: its job was lost, so it would otherwise never finish.
                and(
                  inArray(links.status, ['queued', 'processing']),
                  lt(links.updatedAt, new Date(Date.now() - STUCK_AFTER_MS)),
                ),
              ),
            ),
          )
          .returning({ id: links.id })
        if (!rows.length) return notFound
        await enqueueProcessLink(tx, c.id)
        return { id: c.id, ok: true }
      })

    case 'link.delete':
      // Soft delete: the row stays (sync needs it, and nothing is erased).
      await db
        .update(links)
        .set({ deletedAt: new Date() })
        .where(and(eq(links.id, c.id), eq(links.userId, userId), isNull(links.deletedAt)))
      return { id: c.id, ok: true }

    case 'collection.create': {
      const [existing] = await db
        .select({ userId: collections.userId })
        .from(collections)
        .where(eq(collections.id, c.id))
      if (existing) {
        return existing.userId === userId
          ? { id: c.id, ok: true }
          : { id: c.id, ok: false, error: 'not_allowed' }
      }
      try {
        await db.insert(collections).values({ id: c.id, userId, name: c.name, color: c.color })
        return { id: c.id, ok: true }
      } catch (err) {
        if (pgCode(err) === '23505') return { id: c.id, ok: false, error: 'name_taken' }
        throw err
      }
    }

    case 'collection.update':
      try {
        const set = withoutUndefined(c.patch)
        if (!Object.keys(set).length) {
          const [row] = await db
            .select({ id: collections.id })
            .from(collections)
            .where(ownCollection)
          return row ? { id: c.id, ok: true } : notFound
        }
        const rows = await db
          .update(collections)
          .set(set)
          .where(ownCollection)
          .returning({ id: collections.id })
        return rows.length ? { id: c.id, ok: true } : notFound
      } catch (err) {
        if (pgCode(err) === '23505') return { id: c.id, ok: false, error: 'name_taken' }
        throw err
      }

    case 'collection.delete':
      return db.transaction(async (tx) => {
        const rows = await tx
          .update(collections)
          .set({ deletedAt: new Date() })
          .where(ownCollection)
          .returning({ id: collections.id })
        if (rows.length) {
          // Its links move to Unsorted; they are not deleted.
          await tx
            .update(links)
            .set({ collectionId: null })
            .where(and(eq(links.userId, userId), eq(links.collectionId, c.id)))
        }
        return { id: c.id, ok: true }
      })
  }
}

/** Applies changes in order; one bad change doesn't stop the rest. */
export async function pushChanges(userId: string, changes: Change[]): Promise<SyncResult[]> {
  const results: SyncResult[] = []
  for (const change of changes) results.push(await applyChange(userId, change))
  return results
}

const iso = (d: Date | null) => (d ? d.toISOString() : null)

function toSyncLink(r: typeof links.$inferSelect): SyncLink {
  return {
    id: r.id,
    url: r.url,
    site: r.site,
    title: r.title,
    description: r.description,
    imageUrl: r.imageUrl,
    type: r.type,
    summary: r.summary,
    tags: r.tags,
    collectionId: r.collectionId,
    note: r.note,
    status: r.status,
    aiSkipReason: r.aiSkipReason,
    aiSuggestedCollection: r.aiSuggestedCollection,
    readLater: r.readLater,
    readMinutes: r.readMinutes,
    failReason: r.failReason,
    savedAt: r.savedAt.toISOString(),
    processedAt: iso(r.processedAt),
    updatedAt: r.updatedAt.toISOString(),
    serverVersion: r.serverVersion,
    deletedAt: iso(r.deletedAt),
  }
}

function toSyncCollection(r: typeof collections.$inferSelect): SyncCollection {
  return {
    id: r.id,
    name: r.name,
    color: r.color as SyncCollection['color'],
    description: r.description,
    pinned: r.pinned,
    aiCreated: r.aiCreated,
    serverVersion: r.serverVersion,
    deletedAt: iso(r.deletedAt),
  }
}

/**
 * app_settings change rarely (admin edits) but pulls run every few seconds per active
 * user, so each server instance reuses them for a short while.
 */
const SETTINGS_TTL_MS = 30_000
let settingsCache: { value: AppSettings; at: number } | undefined

async function cachedAppSettings(db: Db) {
  if (!settingsCache || Date.now() - settingsCache.at > SETTINGS_TTL_MS) {
    settingsCache = { value: await getAppSettings(db), at: Date.now() }
  }
  return settingsCache.value
}

export async function aiUsageFor(userId: string): Promise<AiUsage> {
  const db = getDb()
  const [[owner], settings] = await Promise.all([
    db
      .select({
        timezone: user.timezone,
        aiEnabled: user.aiEnabled,
        dailyAiLimit: user.dailyAiLimit,
        dailyAiLimitUntil: user.dailyAiLimitUntil,
      })
      .from(user)
      .where(eq(user.id, userId)),
    cachedAppSettings(db),
  ])
  if (!owner) return { used: 0, limit: 0, enabled: false }
  return {
    used: await aiUsedToday(db, userId, owner.timezone),
    limit: effectiveDailyLimit(owner, settings),
    enabled: owner.aiEnabled && !settings.aiKillSwitch,
  }
}

/**
 * Rows changed after `since` (deletes included), oldest first. Links and collections
 * share one version sequence, so the merged list gives a single cursor.
 */
export async function pullChanges(userId: string, since: number): Promise<SyncPullResponse> {
  const db = getDb()
  const [linkRows, collectionRows, usage] = await Promise.all([
    db
      .select()
      .from(links)
      .where(and(eq(links.userId, userId), gt(links.serverVersion, since)))
      .orderBy(asc(links.serverVersion))
      .limit(SYNC_PULL_LIMIT + 1),
    db
      .select()
      .from(collections)
      .where(and(eq(collections.userId, userId), gt(collections.serverVersion, since)))
      .orderBy(asc(collections.serverVersion))
      .limit(SYNC_PULL_LIMIT + 1),
    aiUsageFor(userId),
  ])
  const merged = [
    ...linkRows.map((r) => ({ v: r.serverVersion, link: r })),
    ...collectionRows.map((r) => ({ v: r.serverVersion, collection: r })),
  ].sort((a, b) => a.v - b.v)
  const page = merged.slice(0, SYNC_PULL_LIMIT)
  return {
    links: page.flatMap((e) => ('link' in e && e.link ? [toSyncLink(e.link)] : [])),
    collections: page.flatMap((e) =>
      'collection' in e && e.collection ? [toSyncCollection(e.collection)] : [],
    ),
    cursor: page.at(-1)?.v ?? since,
    hasMore: merged.length > SYNC_PULL_LIMIT,
    usage,
  }
}
