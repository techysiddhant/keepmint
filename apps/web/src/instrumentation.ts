import * as Sentry from '@sentry/nextjs'

// The web app reports to its own Sentry project; SENTRY_DSN belongs to the worker.
export async function register() {
  if (!process.env.NEXT_PUBLIC_SENTRY_DSN) return
  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    tracesSampleRate: 0.1,
    environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV,
  })
}

export const onRequestError = Sentry.captureRequestError
