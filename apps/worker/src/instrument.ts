// Loaded with `--import` before any other module, so Sentry can instrument
// pg, fetch and http as they're imported. Does nothing without SENTRY_DSN.
// Reads process.env directly so a missing DATABASE_URL can't stop error reporting.
import { resolve } from 'node:path'
import * as Sentry from '@sentry/node'
import { config } from 'dotenv'

config({ path: resolve(import.meta.dirname, '../../../.env'), quiet: true })

const dsn = process.env.SENTRY_DSN
if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV ?? 'development',
    // 10% of traces keeps us inside the free tier; errors are always sent.
    tracesSampleRate: 0.1,
    // The worker handles users' links and calls the AI API: don't ship user
    // identity or request/response bodies (page text, prompts) to Sentry.
    dataCollection: {
      userInfo: false,
      httpBodies: [],
    },
  })
}
