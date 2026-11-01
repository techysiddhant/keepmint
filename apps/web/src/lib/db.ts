import 'server-only'
import { createDb } from '@keepmint/db'
import { serverEnv } from './env'

// One pool per server instance, reused across requests and hot reloads.
const globalForDb = globalThis as unknown as { keepmintDb?: ReturnType<typeof createDb> }

export function getDb() {
  globalForDb.keepmintDb ??= createDb(serverEnv().DATABASE_URL, { max: 3 })
  return globalForDb.keepmintDb.db
}
