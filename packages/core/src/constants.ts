/** Fallbacks used when a row in `app_settings` is missing. The rows themselves are seeded by migration 0001. */
export const DEFAULTS = {
  dailyAiLimit: 50,
  importAllowance: 300,
  dailySpendCeilingUsd: 3,
  reviewConfidenceThreshold: 0.6,
} as const

export const AI_MODEL = 'claude-haiku-5-5'

/** USD per million tokens for AI_MODEL. Keep in sync with the provider's pricing page. */
export const AI_PRICE_PER_MTOK = { input: 0.1, output: 0.5 } as const

/** Characters of page text sent to the model (~1,200 tokens). */
export const AI_INPUT_CHAR_LIMIT = 5000

export const LINK_TYPES = [
  'article',
  'video',
  'repo',
  'thread',
  'recipe',
  'product',
  'podcast',
  'pdf',
  'job',
  'other',
] as const
export type LinkType = (typeof LINK_TYPES)[number]

export const LINK_STATUSES = [
  'queued',
  'processing',
  'done',
  'needs_review',
  'no_ai',
  'failed',
] as const
export type LinkStatus = (typeof LINK_STATUSES)[number]

export const AI_SKIP_REASONS = [
  'daily_limit',
  'ai_disabled',
  'kill_switch',
  'spend_ceiling',
  'import_over_allowance',
] as const
export type AiSkipReason = (typeof AI_SKIP_REASONS)[number]

export const COLLECTION_COLORS = ['violet', 'pink', 'yellow', 'mint', 'sky', 'lilac'] as const
export type CollectionColor = (typeof COLLECTION_COLORS)[number]

/** Names of pg-boss queues shared by the web app (producer) and the worker (consumer). */
export const QUEUES = {
  processLink: 'process-link',
  processImport: 'process-import',
  ping: 'ping',
} as const
