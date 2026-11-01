import { AI_SKIP_REASONS, LINK_STATUSES, LINK_TYPES } from '@keepmint/core'
import { pgEnum } from 'drizzle-orm/pg-core'

export const userRole = pgEnum('user_role', ['user', 'admin', 'owner'])
export const importAccess = pgEnum('import_access', ['none', 'requested', 'approved', 'denied'])
export const linkType = pgEnum('link_type', LINK_TYPES)
export const linkStatus = pgEnum('link_status', LINK_STATUSES)
export const aiSkipReason = pgEnum('ai_skip_reason', AI_SKIP_REASONS)
export const readState = pgEnum('read_state', ['unread', 'in_progress', 'done'])
export const linkSource = pgEnum('link_source', ['app', 'import', 'extension'])
export const suggestionStatus = pgEnum('suggestion_status', ['open', 'accepted', 'dismissed'])
export const requestStatus = pgEnum('request_status', ['pending', 'approved', 'denied'])
export const importJobStatus = pgEnum('import_job_status', [
  'uploaded',
  'parsing',
  'ready',
  'saving',
  'sorting',
  'done',
  'failed',
])
export const aiCallKind = pgEnum('ai_call_kind', [
  'sort',
  'collection_only',
  'fill_collection',
  'import_batch',
])
export const aiCallStatus = pgEnum('ai_call_status', ['ok', 'error'])
