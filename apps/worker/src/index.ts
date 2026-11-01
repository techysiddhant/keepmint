import { QUEUES } from '@keepmint/core'
import * as Sentry from '@sentry/node'
import { createBoss } from './boss'
import { env } from './env'
import { handlePing, type PingData } from './jobs/ping'

// Sentry is initialised in ./instrument.ts, loaded with --import before this file.

const boss = createBoss()

async function main() {
  await boss.start()
  for (const name of Object.values(QUEUES)) await boss.createQueue(name)

  await boss.work<PingData>(QUEUES.ping, handlePing)

  console.log(`[worker] ready (${env.NODE_ENV}) — queues: ${Object.values(QUEUES).join(', ')}`)
}

// Railway sends SIGTERM on redeploy: finish running jobs, then exit.
let stopping = false
async function shutdown(signal: string) {
  if (stopping) return
  stopping = true
  console.log(`[worker] ${signal} received, stopping…`)
  await boss.stop({ graceful: true, timeout: 20_000 })
  await Sentry.flush(2_000)
  process.exit(0)
}
process.on('SIGTERM', () => void shutdown('SIGTERM'))
process.on('SIGINT', () => void shutdown('SIGINT'))

main().catch(async (err) => {
  console.error('[worker] failed to start', err)
  Sentry.captureException(err)
  await Sentry.flush(2_000)
  process.exit(1)
})
