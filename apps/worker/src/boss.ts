import { PgBoss } from 'pg-boss'
import { env } from './env'

/**
 * `worker` runs supervision, cron and schema migration. `producer` only sends jobs
 * (scripts today, the web app later) and must not start a second supervisor.
 */
export function createBoss(role: 'worker' | 'producer' = 'worker') {
  const producer = role === 'producer'
  const boss = new PgBoss({
    connectionString: env.DATABASE_URL,
    max: producer ? 1 : 5,
    application_name: producer ? 'keepmint-producer' : 'keepmint-worker',
    supervise: !producer,
    schedule: !producer,
    migrate: !producer,
  })
  boss.on('error', (err) => console.error('[pg-boss]', err))
  return boss
}
