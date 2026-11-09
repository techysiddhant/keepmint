import { AI_MODEL, type AiSkipReason } from '@keepmint/core'
import { type AppSettings, aiCalls, aiUsageDaily } from '@keepmint/db'
import { and, eq, gte, sql } from 'drizzle-orm'
import type { Logger } from 'pino'
import { db } from '../db'
import type { AiUsageInfo } from './ai'

// Shared by every job that calls Claude: the switches, the daily allowance and the log.

type Owner = { aiEnabled: boolean }

/** Global and per-user switches that stop AI before anything is spent. */
export async function aiBlockReason(
  owner: Owner,
  settings: AppSettings,
): Promise<AiSkipReason | null> {
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
export async function reserve(userId: string, day: string, limit: number) {
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
export async function refund(userId: string, day: string) {
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

/** Logs a Claude call and records it in ai_calls (tokens + cost) for the admin screens. */
export async function recordAiCall(
  log: Logger,
  call: {
    userId: string
    linkId: string | null
    kind: 'sort' | 'collection_only' | 'fill_collection'
    usage: AiUsageInfo
    errorCode?: string
  },
) {
  const { usage, kind, errorCode } = call
  const fields = {
    kind,
    inputTokens: usage.inputTokens,
    outputTokens: usage.outputTokens,
    costUsd: Number(usage.costUsd.toFixed(6)),
    ms: usage.latencyMs,
  }
  if (errorCode) log.warn({ ...fields, code: errorCode }, 'AI call failed')
  else log.info(fields, 'AI call')
  await db.insert(aiCalls).values({
    userId: call.userId,
    linkId: call.linkId,
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

/**
 * What's safe to log from an error: its type and Postgres/API code. Messages are left out
 * because drizzle puts the query's bound parameters (titles, summaries, URLs) in them.
 */
export function safeError(err: unknown) {
  const e = err as { name?: string; code?: string; cause?: { code?: string } }
  return { errorName: e?.name ?? typeof err, errorCode: e?.code ?? e?.cause?.code }
}
