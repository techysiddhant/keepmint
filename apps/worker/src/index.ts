import { QUEUES } from '@keepmint/core'
import * as Sentry from '@sentry/node'
import { createBoss } from './boss'
import { pool } from './db'
import { env } from './env'
import { handlePing, type PingData } from './jobs/ping'
import { handleProcessLink, type ProcessLinkData } from './jobs/process-link'
import { log } from './logger'

// Sentry is initialised in ./instrument.ts, loaded with --import before this file.

/**
 * Per queue: how long a job may run before pg-boss treats its worker as dead and retries.
 * A link worst case is ~2.5 min (Claude timeout 30 s × 3 tries plus several 10 s fetches).
 */
const QUEUE_OPTIONS = {
  [QUEUES.processLink]: { expireInSeconds: 300, retryLimit: 2, retryBackoff: true },
  // Phase 7 sets this properly; an import of ~1,000 links must not expire mid-run.
  [QUEUES.processImport]: { expireInSeconds: 3600, retryLimit: 1, retryBackoff: true },
  [QUEUES.ping]: { expireInSeconds: 60, retryLimit: 0 },
} satisfies Record<(typeof QUEUES)[keyof typeof QUEUES], object>

const boss = createBoss()

async function main() {
  if (!env.ANTHROPIC_API_KEY) throw new Error('ANTHROPIC_API_KEY is not set')
  await boss.start()
  for (const [name, options] of Object.entries(QUEUE_OPTIONS)) {
    // createQueue ignores options for a queue that already exists, so update those.
    if (await boss.getQueue(name)) await boss.updateQueue(name, options)
    else await boss.createQueue(name, options)
  }

  await boss.work<PingData>(QUEUES.ping, handlePing)
  // ~5 links at once stays well inside the API's rate limits.
  await boss.work<ProcessLinkData>(QUEUES.processLink, { localConcurrency: 5 }, handleProcessLink)

  log.info({ env: env.NODE_ENV, queues: Object.values(QUEUES) }, 'worker ready')
}

// Railway sends SIGTERM on redeploy: finish running jobs, then exit.
let stopping = false
async function shutdown(signal: string) {
  if (stopping) return
  stopping = true
  log.info({ signal }, 'stopping: finishing running jobs')
  await boss.stop({ graceful: true, timeout: 20_000 })
  await pool.end()
  await Sentry.flush(2_000)
  log.flush()
  process.exit(0)
}
process.on('SIGTERM', () => void shutdown('SIGTERM'))
process.on('SIGINT', () => void shutdown('SIGINT'))

main().catch(async (err) => {
  log.fatal({ err }, 'worker failed to start')
  Sentry.captureException(err)
  await Sentry.flush(2_000)
  log.flush()
  process.exit(1)
})
