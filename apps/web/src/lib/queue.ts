import 'server-only'
import { PgBoss } from 'pg-boss'
import { serverEnv } from './env'

const globalForBoss = globalThis as unknown as { keepmintBoss?: Promise<PgBoss> }

/**
 * pg-boss as a producer only: the web app adds jobs, the Railway worker runs them (and
 * owns the pg-boss schema, cron and supervision). Started once per server instance.
 */
export function getBoss() {
  globalForBoss.keepmintBoss ??= (async () => {
    const boss = new PgBoss({
      connectionString: serverEnv().DATABASE_URL,
      max: 1,
      application_name: 'keepmint-web',
      supervise: false,
      schedule: false,
      migrate: false,
    })
    boss.on('error', (err) => console.error('[pg-boss]', err))
    await boss.start()
    return boss
  })().catch((err) => {
    globalForBoss.keepmintBoss = undefined
    throw err
  })
  return globalForBoss.keepmintBoss
}
