import { sql } from 'drizzle-orm'
import {
  bigint,
  boolean,
  customType,
  date,
  doublePrecision,
  foreignKey,
  index,
  integer,
  jsonb,
  numeric,
  pgSequence,
  pgTable,
  primaryKey,
  real,
  smallint,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core'
import { user } from './auth'
import {
  aiCallKind,
  aiCallStatus,
  aiSkipReason,
  importJobStatus,
  linkSource,
  linkStatus,
  linkType,
  readState,
  requestStatus,
  suggestionStatus,
} from './enums'

const tsvector = customType<{ data: string }>({ dataType: () => 'tsvector' })

const createdAt = () => timestamp({ withTimezone: true }).notNull().defaultNow()
const userRef = () =>
  text()
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' })

/** Bumped on every insert/update of synced rows; the offline sync cursor. */
export const syncVersionSeq = pgSequence('sync_version_seq')
const serverVersion = () =>
  bigint({ mode: 'number' }).notNull().default(sql`nextval('sync_version_seq')`)

export const collections = pgTable(
  'collections',
  {
    id: uuid().primaryKey(), // made on the device
    userId: userRef(),
    name: text().notNull(),
    color: text().notNull().default('violet'),
    description: text(),
    pinned: boolean().notNull().default(false),
    aiCreated: boolean().notNull().default(false),
    serverVersion: serverVersion(),
    createdAt: createdAt(),
    updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp({ withTimezone: true }),
  },
  (t) => [
    uniqueIndex('collections_user_name_live_idx')
      .on(t.userId, sql`lower(${t.name})`)
      .where(sql`${t.deletedAt} is null`),
    index('collections_user_version_idx').on(t.userId, t.serverVersion),
    // Target of the user-scoped foreign keys below, so rows can only point at their own user's collections.
    unique('collections_user_id_key').on(t.userId, t.id),
  ],
)

export const importJobs = pgTable(
  'import_jobs',
  {
    id: uuid().primaryKey().defaultRandom(),
    userId: userRef(),
    status: importJobStatus().notNull().default('uploaded'),
    fileKey: text().notNull(),
    fileName: text().notNull(),
    browser: text(),
    folders: jsonb().$type<Array<{ path: string; count: number; selected: boolean }>>(),
    foldersToCollections: boolean().notNull().default(true),
    total: integer().notNull().default(0),
    skippedDuplicates: integer().notNull().default(0),
    saved: integer().notNull().default(0),
    aiQueued: integer().notNull().default(0),
    aiSorted: integer().notNull().default(0),
    failed: integer().notNull().default(0),
    batchId: text(),
    error: text(),
    createdAt: createdAt(),
    finishedAt: timestamp({ withTimezone: true }),
  },
  (t) => [index('import_jobs_user_created_idx').on(t.userId, t.createdAt.desc())],
)

export const links = pgTable(
  'links',
  {
    id: uuid().primaryKey(), // made on the device
    userId: userRef(),
    url: text().notNull(),
    urlHash: text().notNull(),
    site: text(),
    title: text(),
    description: text(),
    imageUrl: text(),
    type: linkType().notNull().default('article'),
    summary: text(),
    tags: text().array().notNull().default(sql`'{}'::text[]`),
    // FK (user_id, collection_id) → collections(user_id, id) ON DELETE SET NULL (collection_id)
    // lives in migration 0001: drizzle can't express a column list on SET NULL.
    collectionId: uuid(),
    note: text(),
    status: linkStatus().notNull().default('queued'),
    aiSkipReason: aiSkipReason(),
    aiSuggestedCollection: text(),
    aiConfidence: real(),
    reviewedAt: timestamp({ withTimezone: true }),
    readLater: boolean().notNull().default(false),
    readLaterRank: doublePrecision(),
    readState: readState().notNull().default('unread'),
    readProgress: smallint().notNull().default(0),
    readMinutes: smallint(),
    finishedAt: timestamp({ withTimezone: true }),
    contentKey: text(),
    contentBytes: integer(),
    failReason: text(),
    attempts: smallint().notNull().default(0),
    source: linkSource().notNull().default('app'),
    importJobId: uuid().references(() => importJobs.id, { onDelete: 'set null' }),
    search: tsvector(),
    savedAt: timestamp({ withTimezone: true }).notNull(),
    processedAt: timestamp({ withTimezone: true }),
    serverVersion: serverVersion(),
    createdAt: createdAt(),
    updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp({ withTimezone: true }),
  },
  (t) => [
    uniqueIndex('links_user_url_live_idx')
      .on(t.userId, t.urlHash)
      .where(sql`${t.deletedAt} is null`),
    index('links_user_version_idx').on(t.userId, t.serverVersion),
    index('links_user_collection_idx')
      .on(t.userId, t.collectionId)
      .where(sql`${t.deletedAt} is null`),
    index('links_read_later_idx')
      .on(t.userId, t.readLaterRank)
      .where(sql`${t.readLater} and ${t.deletedAt} is null`),
    index('links_user_status_idx')
      .on(t.userId, t.status)
      .where(sql`${t.status} in ('queued', 'processing', 'failed', 'needs_review')`),
    index('links_search_idx').using('gin', t.search),
  ],
)

export const collectionSuggestions = pgTable(
  'collection_suggestions',
  {
    id: uuid().primaryKey().defaultRandom(),
    userId: userRef(),
    name: text().notNull(),
    reason: text(),
    linkIds: uuid().array().notNull().default(sql`'{}'::uuid[]`),
    status: suggestionStatus().notNull().default('open'),
    createdAt: createdAt(),
    decidedAt: timestamp({ withTimezone: true }),
  },
  (t) => [
    uniqueIndex('collection_suggestions_open_idx')
      .on(t.userId, sql`lower(${t.name})`)
      .where(sql`${t.status} = 'open'`),
  ],
)

export const aiCorrections = pgTable(
  'ai_corrections',
  {
    id: bigint({ mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
    userId: userRef(),
    linkId: uuid().references(() => links.id, { onDelete: 'set null' }),
    title: text().notNull(),
    suggested: text(),
    chosenCollectionId: uuid().notNull(),
    createdAt: createdAt(),
  },
  (t) => [
    index('ai_corrections_user_created_idx').on(t.userId, t.createdAt.desc()),
    foreignKey({
      name: 'ai_corrections_collection_fk',
      columns: [t.userId, t.chosenCollectionId],
      foreignColumns: [collections.userId, collections.id],
    }).onDelete('cascade'),
  ],
)

export const urlSummaryCache = pgTable('url_summary_cache', {
  urlHash: text().primaryKey(),
  normalizedUrl: text().notNull(),
  type: linkType().notNull(),
  site: text(),
  title: text(),
  description: text(),
  imageUrl: text(),
  summary: text().notNull(),
  tags: text().array().notNull().default(sql`'{}'::text[]`),
  readMinutes: smallint(),
  contentKey: text(),
  contentBytes: integer(),
  model: text().notNull(),
  hits: integer().notNull().default(0),
  createdAt: createdAt(),
  refreshedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
})

/** The 50-a-day counter. `day` is the user's local date. */
export const aiUsageDaily = pgTable(
  'ai_usage_daily',
  {
    userId: userRef(),
    day: date().notNull(),
    count: integer().notNull().default(0),
  },
  (t) => [primaryKey({ columns: [t.userId, t.day] })],
)

export const aiCalls = pgTable(
  'ai_calls',
  {
    id: bigint({ mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
    userId: userRef(),
    linkId: uuid().references(() => links.id, { onDelete: 'set null' }),
    kind: aiCallKind().notNull(),
    model: text().notNull(),
    inputTokens: integer().notNull().default(0),
    outputTokens: integer().notNull().default(0),
    costUsd: numeric({ precision: 10, scale: 6 }).notNull().default('0'),
    status: aiCallStatus().notNull(),
    errorCode: text(),
    latencyMs: integer(),
    batchId: text(),
    createdAt: createdAt(),
  },
  (t) => [
    index('ai_calls_created_idx').on(t.createdAt),
    index('ai_calls_user_created_idx').on(t.userId, t.createdAt),
  ],
)

export const aiSpendDaily = pgTable(
  'ai_spend_daily',
  {
    day: date().notNull(),
    kind: aiCallKind().notNull(),
    calls: integer().notNull().default(0),
    errors: integer().notNull().default(0),
    inputTokens: bigint({ mode: 'number' }).notNull().default(0),
    outputTokens: bigint({ mode: 'number' }).notNull().default(0),
    costUsd: numeric({ precision: 10, scale: 4 }).notNull().default('0'),
  },
  (t) => [primaryKey({ columns: [t.day, t.kind] })],
)

export const importRequests = pgTable(
  'import_requests',
  {
    id: uuid().primaryKey().defaultRandom(),
    userId: userRef(),
    status: requestStatus().notNull().default('pending'),
    message: text(),
    requestedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    decidedBy: text().references(() => user.id, { onDelete: 'set null' }),
    decidedAt: timestamp({ withTimezone: true }),
    aiAllowance: integer(),
    adminNote: text(),
  },
  (t) => [
    uniqueIndex('import_requests_one_pending_idx').on(t.userId).where(sql`${t.status} = 'pending'`),
    index('import_requests_status_idx').on(t.status, t.requestedAt),
  ],
)

/** Every admin change. Insert-only (enforced by a trigger). */
export const auditLog = pgTable(
  'audit_log',
  {
    id: bigint({ mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
    // Nulled if the admin's account is deleted; actor_email keeps who it was.
    actorId: text().references(() => user.id, { onDelete: 'set null' }),
    actorEmail: text().notNull(),
    targetUserId: text().references(() => user.id, { onDelete: 'set null' }),
    action: text().notNull(),
    before: jsonb(),
    after: jsonb(),
    reason: text(),
    createdAt: createdAt(),
  },
  (t) => [
    index('audit_log_created_idx').on(t.createdAt.desc()),
    index('audit_log_target_idx').on(t.targetUserId, t.createdAt.desc()),
    index('audit_log_actor_idx').on(t.actorId, t.createdAt.desc()),
  ],
)

export const appSettings = pgTable('app_settings', {
  key: text().primaryKey(),
  value: jsonb().notNull(),
  updatedBy: text().references(() => user.id, { onDelete: 'set null' }),
  updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
})
