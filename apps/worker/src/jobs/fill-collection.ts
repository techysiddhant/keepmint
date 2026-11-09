import { localDay } from '@keepmint/core'
import { collections, effectiveDailyLimit, getAppSettings, links, user } from '@keepmint/db'
import * as Sentry from '@sentry/node'
import { and, eq, inArray, isNull, sql } from 'drizzle-orm'
import type { Job } from 'pg-boss'
import { db } from '../db'
import { AiCallError, describeCollection } from '../lib/ai'
import { aiBlockReason, recordAiCall, refund, reserve, safeError } from '../lib/ai-budget'
import { log } from '../logger'

export type FillCollectionData = { collectionId: string }

/** Words too generic to file links by. */
const STOPWORDS = new Set([
  'and',
  'the',
  'for',
  'with',
  'from',
  'about',
  'my',
  'your',
  'our',
  'stuff',
  'things',
  'links',
  'misc',
  'other',
  'later',
  'reads',
  'saved',
])

/** Lower-case letter/digit words of 3+ characters, minus stopwords. */
function words(text: string) {
  return text
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter((w) => w.length >= 3 && !STOPWORDS.has(w))
}

/** Prefix match for longer words ("recipe" finds "recipes"), exact for short ones. */
function toTsQuery(keywords: string[]) {
  return keywords.map((k) => (k.length >= 4 ? `${k}:*` : k)).join(' | ')
}

export async function handleFillCollection(jobs: Job<FillCollectionData>[]) {
  for (const job of jobs) await fillCollection(job.data.collectionId)
}

/**
 * "Let AI fill it" on a new collection: one AI call writes its description and suggests
 * keywords (counts as 1 AI sort; skipped when AI is off or used up), then Unsorted links
 * matching the name or keywords are moved in by a full-text search — no further AI.
 */
export async function fillCollection(collectionId: string) {
  const [row] = await db
    .select({
      collection: collections,
      timezone: user.timezone,
      aiEnabled: user.aiEnabled,
      dailyAiLimit: user.dailyAiLimit,
      dailyAiLimitUntil: user.dailyAiLimitUntil,
      userDeletedAt: user.deletedAt,
    })
    .from(collections)
    .innerJoin(user, eq(user.id, collections.userId))
    .where(eq(collections.id, collectionId))
  if (!row || row.collection.deletedAt || row.userDeletedAt) return
  const { collection } = row
  const clog = log.child({ collectionId })

  try {
    let keywords = words(`${collection.name} ${collection.description ?? ''}`)
    const settings = await getAppSettings(db)
    const block = await aiBlockReason(row, settings)
    const day = localDay(row.timezone)
    if (block) {
      clog.info({ reason: block }, 'AI skipped: matching by name only')
    } else if (!(await reserve(collection.userId, day, effectiveDailyLimit(row, settings)))) {
      clog.info('daily AI limit reached: matching by name only')
    } else {
      try {
        const { output, usage } = await describeCollection(collection.name, collection.description)
        await recordAiCall(clog, {
          userId: collection.userId,
          linkId: null,
          kind: 'fill_collection',
          usage,
        })
        keywords = [...new Set([...keywords, ...output.keywords.flatMap(words)])]
        // Keep a description the user typed; only fill an empty one.
        await db
          .update(collections)
          .set({ description: output.description })
          .where(and(eq(collections.id, collectionId), isNull(collections.description)))
      } catch (err) {
        if (!(err instanceof AiCallError)) throw err
        // Refund first: a failure writing the log must not cost the user a sort.
        await refund(collection.userId, day)
        await recordAiCall(clog, {
          userId: collection.userId,
          linkId: null,
          kind: 'fill_collection',
          usage: err.usage,
          errorCode: err.code,
        })
      }
    }

    if (!keywords.length) return clog.info('no keywords to match links by')
    // Links still waiting for AI review stay in review; everything else in Unsorted may move.
    const moved = await db
      .update(links)
      .set({ collectionId })
      .where(
        and(
          eq(links.userId, collection.userId),
          isNull(links.collectionId),
          isNull(links.deletedAt),
          inArray(links.status, ['done', 'no_ai']),
          sql`${links.search} @@ to_tsquery('simple', ${toTsQuery(keywords.slice(0, 16))})`,
        ),
      )
      .returning({ id: links.id })
    clog.info({ moved: moved.length, keywords: keywords.length }, 'collection filled')
  } catch (err) {
    clog.error(safeError(err), 'fill collection failed')
    Sentry.captureException(err, { tags: { job: 'fill-collection' }, extra: { collectionId } })
  }
}
