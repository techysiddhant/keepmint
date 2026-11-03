import { randomUUID } from 'node:crypto'
import {
  AI_MODEL,
  type AiSkipReason,
  COLLECTION_COLORS,
  type LinkStatus,
  type LinkType,
  localDay,
  normalizeLinkUrl,
} from '@keepmint/core'
import {
  type AppSettings,
  aiCalls,
  aiCorrections,
  aiUsageDaily,
  collections,
  effectiveDailyLimit,
  getAppSettings,
  links,
  urlSummaryCache,
  user,
} from '@keepmint/db'
import * as Sentry from '@sentry/node'
import { and, desc, eq, gte, isNull, lt, or, sql } from 'drizzle-orm'
import type { Job } from 'pg-boss'
import type { Logger } from 'pino'
import { db } from '../db'
import {
  AiCallError,
  type AiCollection,
  type AiCorrection,
  type AiUsageInfo,
  pickCollection,
  sortLink,
} from '../lib/ai'
import { storePageCopy } from '../lib/r2'
import { estimateReadMinutes, readPage } from '../lib/read-page'
import { log } from '../logger'

export type ProcessLinkData = { linkId: string }

const MAX_ATTEMPTS = 3
/**
 * A link left in `processing` longer than this belongs to a dead run and may be taken
 * over. Shorter than the queue's 5-minute expiry, longer than a real run (~2.5 min).
 */
const STALE_PROCESSING_MS = 4 * 60 * 1000
const CACHE_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000
/** Page copies are kept for reading material, not for videos, repos or posts. */
const COPY_TYPES: LinkType[] = ['article', 'recipe']
const LONG_FORM_CHARS = 3000

const GENERIC_FAILURE = 'Something went wrong reading this link. Try again.'
const AI_FAILURE = 'Couldn’t summarise this link right now. Try again in a minute.'

export async function handleProcessLink(jobs: Job<ProcessLinkData>[]) {
  for (const job of jobs) await processLink(job.data.linkId, job.signal)
}

type LinkPatch = Partial<typeof links.$inferInsert>

/**
 * Per-link context: its logger, the claim it holds, the job's abort signal, a reserved
 * daily sort (to give back on error) and the outcome.
 */
type Ctx = {
  log: Logger
  linkId: string
  /** `links.attempts` set by this run's claim: the ownership token for its writes. */
  attempt: number
  signal?: AbortSignal
  reservedDay: string | null
  outcome?: { status: LinkStatus; reason?: string | null; collection?: string | null }
}

/** This run no longer owns the link (another run took it over) or pg-boss cancelled the job. */
class LostClaimError extends Error {
  constructor(readonly aborted: boolean) {
    super(aborted ? 'job cancelled' : 'claim taken over by another run')
  }
}

/** Only the run whose claim is still current may write the result. */
const owned = (ctx: Ctx) =>
  and(eq(links.id, ctx.linkId), eq(links.attempts, ctx.attempt), eq(links.status, 'processing'))

/** Checked before each paid AI call: stop if cancelled or no longer the owner. */
async function assertOwned(ctx: Ctx) {
  if (ctx.signal?.aborted) throw new LostClaimError(true)
  const [row] = await db.select({ id: links.id }).from(links).where(owned(ctx))
  if (!row) throw new LostClaimError(false)
}

async function finish(ctx: Ctx, status: LinkStatus, patch: LinkPatch = {}) {
  const rows = await db
    .update(links)
    .set({ ...patch, status, processedAt: new Date() })
    .where(owned(ctx))
    .returning({ id: links.id })
  if (!rows.length) throw new LostClaimError(false)
  ctx.outcome = {
    status,
    reason: patch.failReason ?? patch.aiSkipReason,
    collection: patch.aiSuggestedCollection,
  }
}

/**
 * What's safe to log from an error: its type and Postgres/API code. Messages are left out
 * because drizzle puts the query's bound parameters (titles, summaries, URLs) in them.
 */
function safeError(err: unknown) {
  const e = err as { name?: string; code?: string; cause?: { code?: string } }
  return { errorName: e?.name ?? typeof err, errorCode: e?.code ?? e?.cause?.code }
}

/**
 * Runs one link through the pipeline. Any failure ends the link as `failed`; the only error
 * it rethrows is a cancelled job, so pg-boss retries it instead of marking it complete.
 */
export async function processLink(linkId: string, signal?: AbortSignal) {
  const [row] = await db
    .select({
      link: links,
      timezone: user.timezone,
      aiEnabled: user.aiEnabled,
      dailyAiLimit: user.dailyAiLimit,
      dailyAiLimitUntil: user.dailyAiLimitUntil,
      userDeletedAt: user.deletedAt,
    })
    .from(links)
    .innerJoin(user, eq(user.id, links.userId))
    .where(eq(links.id, linkId))
  // Deleted, already finished, or picked up twice: nothing to do.
  if (!row || row.link.deletedAt || row.userDeletedAt) {
    return log.debug({ linkId }, 'skipped: link or account deleted')
  }
  // Claim it atomically: queued, or `processing` left behind by a dead run. A second copy
  // of the job (pg-boss retry while the first is still running) finds nothing to claim.
  const [claim] = await db
    .update(links)
    .set({ status: 'processing', attempts: sql`${links.attempts} + 1`, failReason: null })
    .where(
      and(
        eq(links.id, linkId),
        isNull(links.deletedAt),
        or(
          eq(links.status, 'queued'),
          and(
            eq(links.status, 'processing'),
            lt(links.updatedAt, new Date(Date.now() - STALE_PROCESSING_MS)),
          ),
        ),
      ),
    )
    .returning({ attempts: links.attempts })
  if (!claim) {
    return log.debug({ linkId, status: row.link.status }, 'skipped: done or already running')
  }
  const link = row.link
  const ctx: Ctx = {
    log: log.child({ linkId, site: link.site }),
    linkId,
    attempt: claim.attempts,
    signal,
    reservedDay: null,
  }
  const started = Date.now()
  ctx.log.info({ attempt: claim.attempts }, 'processing link')

  try {
    if (claim.attempts > MAX_ATTEMPTS) {
      await finish(ctx, 'failed', { failReason: GENERIC_FAILURE })
    } else {
      await runPipeline(ctx, link, row)
    }
  } catch (err) {
    if (ctx.reservedDay) await refund(link.userId, ctx.reservedDay).catch(() => {})
    if (err instanceof LostClaimError) {
      ctx.log.info({ ms: Date.now() - started }, `stopped: ${err.message}`)
      // A cancelled job is retried by pg-boss: hand the link back so the retry can claim it
      // at once. A taken-over link belongs to the other run; leave it alone.
      if (err.aborted) {
        await db
          .update(links)
          .set({ status: 'queued' })
          .where(owned(ctx))
          .catch(() => {})
        throw err
      }
      return
    }
    ctx.log.error(safeError(err), 'pipeline crashed')
    Sentry.captureException(err, { tags: { job: 'process-link' }, extra: { linkId: link.id } })
    await finish(ctx, 'failed', { failReason: GENERIC_FAILURE }).catch(() => {})
  }

  const { status = 'failed', reason, collection } = ctx.outcome ?? {}
  const level = status === 'failed' ? 'warn' : 'info'
  ctx.log[level]({ status, reason, collection, ms: Date.now() - started }, `link ${status}`)
}

type LinkRow = typeof links.$inferSelect
type UserRow = {
  timezone: string
  aiEnabled: boolean
  dailyAiLimit: number | null
  dailyAiLimitUntil: Date | null
}

async function runPipeline(ctx: Ctx, link: LinkRow, owner: UserRow) {
  const settings = await getAppSettings(db)
  const block = await aiBlockReason(owner, settings)
  if (block) ctx.log.info({ reason: block }, 'AI skipped for this link')

  // Someone already saved this URL: reuse the summary. Doesn't count against the 50.
  const cached = await readCache(link.urlHash)
  if (cached) {
    ctx.log.info({ hits: cached.hits + 1 }, 'shared cache hit: reusing summary')
    return applyCached(ctx, link, cached, block, settings)
  }

  const readStarted = Date.now()
  const read = await readPage(link.url)
  if (read.ok) {
    ctx.log.debug(
      { type: read.page.type, chars: read.page.text.length, ms: Date.now() - readStarted },
      'page read',
    )
  } else {
    return finish(ctx, 'failed', { failReason: read.reason })
  }
  const page = read.page
  const metadata: LinkPatch = {
    site: page.site,
    title: page.title,
    description: page.description,
    imageUrl: page.imageUrl,
    ...(page.type ? { type: page.type } : {}),
    readMinutes: estimateReadMinutes(page.text),
  }
  if (block) {
    return finish(ctx, 'no_ai', { ...metadata, aiSkipReason: block })
  }

  await assertOwned(ctx)
  const day = localDay(owner.timezone)
  if (!(await reserve(link.userId, day, effectiveDailyLimit(owner, settings)))) {
    return finish(ctx, 'no_ai', { ...metadata, aiSkipReason: 'daily_limit' })
  }
  ctx.reservedDay = day

  const { list, corrections } = await collectionContext(link.userId)
  let result: Awaited<ReturnType<typeof sortLink>>
  try {
    result = await sortLink(page, list, corrections, ctx.signal)
  } catch (err) {
    if (ctx.signal?.aborted) throw new LostClaimError(true)
    if (!(err instanceof AiCallError)) throw err
    await logCall(ctx, link, 'sort', err.usage, err.code)
    await refund(link.userId, day)
    ctx.reservedDay = null
    return finish(ctx, 'failed', { ...metadata, failReason: AI_FAILURE })
  }
  // The call succeeded, so the sort is spent even if a later step fails.
  ctx.reservedDay = null
  await logCall(ctx, link, 'sort', result.usage)

  const out = result.output
  const type = page.type ?? out.type
  const confident = out.confidence >= settings.reviewConfidenceThreshold
  const collectionId = await resolveCollection(link.userId, out.collection, confident)
  const copy =
    COPY_TYPES.includes(type) || page.text.length >= LONG_FORM_CHARS
      ? await storePageCopy(link.urlHash, page.text)
      : null
  if (copy) ctx.log.debug({ key: copy.key, bytes: copy.bytes }, 'page copy stored')
  const readMinutes = out.readMinutes ?? metadata.readMinutes ?? null

  await finish(ctx, confident ? 'done' : 'needs_review', {
    ...metadata,
    type,
    summary: out.summary,
    tags: out.tags,
    collectionId,
    aiSuggestedCollection: out.collection,
    aiConfidence: out.confidence,
    readMinutes,
    contentKey: copy?.key ?? null,
    contentBytes: copy?.bytes ?? null,
    aiSkipReason: null,
  })

  // Only successful, login-free reads reach the shared cache.
  const cache = {
    normalizedUrl: normalizeLinkUrl(link.url),
    type,
    site: page.site,
    title: page.title,
    description: page.description,
    imageUrl: page.imageUrl,
    summary: out.summary,
    tags: out.tags,
    readMinutes,
    contentKey: copy?.key ?? null,
    contentBytes: copy?.bytes ?? null,
    model: AI_MODEL,
    refreshedAt: new Date(),
  }
  // Best effort: the link is already done, so a cache-write failure must not undo that.
  try {
    await db
      .insert(urlSummaryCache)
      .values({ urlHash: link.urlHash, ...cache })
      .onConflictDoUpdate({ target: urlSummaryCache.urlHash, set: cache })
  } catch (err) {
    ctx.log.warn(safeError(err), 'shared cache write failed')
  }
}

/** Global and per-user switches that stop AI before anything is spent. */
async function aiBlockReason(owner: UserRow, settings: AppSettings): Promise<AiSkipReason | null> {
  if (settings.aiKillSwitch) return 'kill_switch'
  if (!owner.aiEnabled) return 'ai_disabled'
  const startOfDay = new Date()
  startOfDay.setUTCHours(0, 0, 0, 0)
  const [spent] = await db
    .select({ usd: sql<string>`coalesce(sum(${aiCalls.costUsd}), 0)` })
    .from(aiCalls)
    .where(gte(aiCalls.createdAt, startOfDay))
  if (Number(spent?.usd ?? 0) >= settings.dailySpendCeilingUsd) return 'spend_ceiling'
  return null
}

/** One AI sort, taken atomically so parallel jobs can't go past the limit. */
async function reserve(userId: string, day: string, limit: number) {
  // No allowance: don't touch the counter (an insert would record a sort that never ran).
  if (limit <= 0) return false
  const rows = await db
    .insert(aiUsageDaily)
    .values({ userId, day, count: 1 })
    .onConflictDoUpdate({
      target: [aiUsageDaily.userId, aiUsageDaily.day],
      set: { count: sql`${aiUsageDaily.count} + 1` },
      setWhere: sql`${aiUsageDaily.count} < ${limit}`,
    })
    .returning({ count: aiUsageDaily.count })
  return rows.length > 0
}

/** Failed calls don't count: give the reserved sort back. */
async function refund(userId: string, day: string) {
  await db
    .update(aiUsageDaily)
    .set({ count: sql`${aiUsageDaily.count} - 1` })
    .where(
      and(
        eq(aiUsageDaily.userId, userId),
        eq(aiUsageDaily.day, day),
        sql`${aiUsageDaily.count} > 0`,
      ),
    )
}

async function logCall(
  ctx: Ctx,
  link: LinkRow,
  kind: 'sort' | 'collection_only',
  usage: AiUsageInfo,
  errorCode?: string,
) {
  const fields = {
    kind,
    inputTokens: usage.inputTokens,
    outputTokens: usage.outputTokens,
    costUsd: Number(usage.costUsd.toFixed(6)),
    ms: usage.latencyMs,
  }
  if (errorCode) ctx.log.warn({ ...fields, code: errorCode }, 'AI call failed')
  else ctx.log.info(fields, 'AI call')
  await db.insert(aiCalls).values({
    userId: link.userId,
    linkId: link.id,
    kind,
    model: AI_MODEL,
    inputTokens: usage.inputTokens,
    outputTokens: usage.outputTokens,
    costUsd: usage.costUsd.toFixed(6),
    status: errorCode ? 'error' : 'ok',
    errorCode: errorCode ?? null,
    latencyMs: usage.latencyMs,
  })
}

async function readCache(urlHash: string) {
  const [hit] = await db
    .select()
    .from(urlSummaryCache)
    .where(
      and(
        eq(urlSummaryCache.urlHash, urlHash),
        gte(urlSummaryCache.refreshedAt, new Date(Date.now() - CACHE_MAX_AGE_MS)),
      ),
    )
  return hit ?? null
}

async function applyCached(
  ctx: Ctx,
  link: LinkRow,
  cached: typeof urlSummaryCache.$inferSelect,
  block: AiSkipReason | null,
  settings: AppSettings,
) {
  await db
    .update(urlSummaryCache)
    .set({ hits: sql`${urlSummaryCache.hits} + 1` })
    .where(eq(urlSummaryCache.urlHash, cached.urlHash))

  let collectionId: string | null = null
  let suggested: string | null = null
  let confidence: number | null = null
  let status: LinkStatus = 'done'
  if (!block) {
    await assertOwned(ctx)
    const { list, corrections } = await collectionContext(link.userId)
    try {
      const { output, usage } = await pickCollection(
        { title: cached.title ?? link.url, summary: cached.summary, tags: cached.tags },
        list,
        corrections,
        ctx.signal,
      )
      await logCall(ctx, link, 'collection_only', usage)
      const confident = output.confidence >= settings.reviewConfidenceThreshold
      collectionId = await resolveCollection(link.userId, output.collection, confident)
      suggested = output.collection
      confidence = output.confidence
      status = confident ? 'done' : 'needs_review'
    } catch (err) {
      if (ctx.signal?.aborted) throw new LostClaimError(true)
      if (!(err instanceof AiCallError)) throw err
      // The summary is already there; the link just lands in Unsorted.
      await logCall(ctx, link, 'collection_only', err.usage, err.code)
    }
  }

  await finish(ctx, status, {
    type: cached.type,
    site: cached.site,
    title: cached.title,
    description: cached.description,
    imageUrl: cached.imageUrl,
    summary: cached.summary,
    tags: cached.tags,
    readMinutes: cached.readMinutes,
    contentKey: cached.contentKey,
    contentBytes: cached.contentBytes,
    collectionId,
    aiSuggestedCollection: suggested,
    aiConfidence: confidence,
    aiSkipReason: null,
  })
}

/** The user's collections (names only, up to 30) and their 5 latest manual filings. */
async function collectionContext(
  userId: string,
): Promise<{ list: AiCollection[]; corrections: AiCorrection[] }> {
  const [list, corrections] = await Promise.all([
    db
      .select({ name: collections.name, description: collections.description })
      .from(collections)
      .where(and(eq(collections.userId, userId), isNull(collections.deletedAt)))
      .orderBy(desc(collections.pinned), desc(collections.updatedAt))
      .limit(30),
    db
      .select({ title: aiCorrections.title, collection: collections.name })
      .from(aiCorrections)
      .innerJoin(collections, eq(collections.id, aiCorrections.chosenCollectionId))
      .where(eq(aiCorrections.userId, userId))
      .orderBy(desc(aiCorrections.createdAt))
      .limit(5),
  ])
  return { list, corrections }
}

async function findCollection(userId: string, name: string) {
  const [match] = await db
    .select({ id: collections.id })
    .from(collections)
    .where(
      and(
        eq(collections.userId, userId),
        isNull(collections.deletedAt),
        sql`lower(${collections.name}) = lower(${name})`,
      ),
    )
  return match?.id ?? null
}

/**
 * The collection to file into, creating it if the name is new. Low-confidence links stay
 * in Unsorted (with the suggestion saved) until the user confirms them in AI review.
 */
async function resolveCollection(userId: string, name: string | null, confident: boolean) {
  if (!name || !confident) return null
  const existing = await findCollection(userId, name)
  if (existing) return existing

  const [{ count } = { count: 0 }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(collections)
    .where(eq(collections.userId, userId))
  await db
    .insert(collections)
    .values({
      id: randomUUID(),
      userId,
      name,
      color: COLLECTION_COLORS[count % COLLECTION_COLORS.length],
      aiCreated: true,
    })
    // Another job may have just created the same name; then use theirs.
    .onConflictDoNothing()
  return findCollection(userId, name)
}
