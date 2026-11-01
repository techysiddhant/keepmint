import * as Sentry from '@sentry/node'

// Sends one test error to Sentry: `pnpm --filter @keepmint/worker sentry:test`.
if (!Sentry.getClient()) {
  console.error('SENTRY_DSN is not set — nothing to send.')
  process.exit(1)
}
const id = Sentry.captureException(new Error('Keepmint worker: Sentry test error'))
await Sentry.flush(5_000)
console.log(`sent test error ${id} — check the keepmint-worker project in Sentry`)
