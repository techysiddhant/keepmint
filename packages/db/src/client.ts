import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import * as schema from './schema'

export function createDb(connectionString: string, { max = 5 }: { max?: number } = {}) {
  const pool = new Pool({ connectionString, max })
  const db = drizzle({ client: pool, schema, casing: 'snake_case' })
  return { db, pool }
}

export type Db = ReturnType<typeof createDb>['db']
