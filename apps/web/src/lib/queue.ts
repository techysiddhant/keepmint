import 'server-only'
import { QUEUES } from '@keepmint/core'
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
    // A new queue doesn't exist until the updated worker has started once; create it with
    // defaults so sends don't fail meanwhile (the worker then applies its own options).
    for (const name of [QUEUES.processLink, QUEUES.fillCollection]) {
      if (!(await boss.getQueue(name))) await boss.createQueue(name)
    }
    return boss
  })().catch((err) => {
    globalForBoss.keepmintBoss = undefined
    throw err
  })
  return globalForBoss.keepmintBoss
}
