import { DEFAULTS, localDay } from '@keepmint/core'
import { and, eq } from 'drizzle-orm'
import type { Db } from './client'
import { aiUsageDaily, appSettings } from './schema'

export type AppSettings = {
  defaultDailyAiLimit: number
  aiKillSwitch: boolean
  dailySpendCeilingUsd: number
  reviewConfidenceThreshold: number
}

/** Global settings from `app_settings`, falling back to DEFAULTS for a missing row. */
export async function getAppSettings(db: Db): Promise<AppSettings> {
  const rows = await db.select().from(appSettings)
  const value = new Map(rows.map((r) => [r.key, r.value]))
  const num = (key: string, fallback: number) => {
    const v = Number(value.get(key))
    return Number.isFinite(v) ? v : fallback
  }
  return {
    defaultDailyAiLimit: num('default_daily_ai_limit', DEFAULTS.dailyAiLimit),
    aiKillSwitch: value.get('ai_kill_switch') === true,
    dailySpendCeilingUsd: num('daily_spend_ceiling_usd', DEFAULTS.dailySpendCeilingUsd),
    reviewConfidenceThreshold: num(
      'review_confidence_threshold',
      DEFAULTS.reviewConfidenceThreshold,
    ),
  }
}

type LimitUser = { dailyAiLimit: number | null; dailyAiLimitUntil: Date | null }

/** A per-user override (optionally time-boxed) wins over the global default. */
export function effectiveDailyLimit(user: LimitUser, settings: AppSettings, now = new Date()) {
  const overrideActive =
    user.dailyAiLimit !== null && (!user.dailyAiLimitUntil || user.dailyAiLimitUntil > now)
  return overrideActive ? (user.dailyAiLimit as number) : settings.defaultDailyAiLimit
}

/** AI sorts the user has used today, in their own time zone. */
export async function aiUsedToday(db: Db, userId: string, timezone: string) {
  const [row] = await db
    .select({ count: aiUsageDaily.count })
    .from(aiUsageDaily)
    .where(and(eq(aiUsageDaily.userId, userId), eq(aiUsageDaily.day, localDay(timezone))))
  return row?.count ?? 0
}
