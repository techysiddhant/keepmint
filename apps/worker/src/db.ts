import { createDb } from '@keepmint/db'
import { env } from './env'

// Matches pg-boss's 5 workers: one connection each, plus one spare.
export const { db, pool } = createDb(env.DATABASE_URL, { max: 6 })
