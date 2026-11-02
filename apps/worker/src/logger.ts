import { pino } from 'pino'
import { env } from './env'

/**
 * Structured logs. In development: short coloured lines (pino-pretty). In production:
 * one JSON object per line, which Railway's log viewer can search and filter, e.g. by
 * `linkId`. Never log page text, prompts, emails or full URLs — `site` (the host) is enough.
 */
export const log = pino({
  level: env.LOG_LEVEL,
  base: { service: 'worker' },
  // Level names ("warn", not 40) and ISO times, so Railway can filter and sort them.
  formatters: { level: (label) => ({ level: label }) },
  timestamp: pino.stdTimeFunctions.isoTime,
  // Belt and braces: drop these if they ever end up in a log call.
  redact: { paths: ['url', 'email', 'text', 'prompt', '*.url', '*.email'], remove: true },
  // Pretty output only in a terminal: Railway's stdout isn't one, so it always gets JSON
  // (even if NODE_ENV isn't set there), and pino-pretty never has to be installed in prod.
  ...(env.NODE_ENV === 'production' || !process.stdout.isTTY
    ? {}
    : {
        transport: {
          target: 'pino-pretty',
          options: { translateTime: 'HH:MM:ss', ignore: 'pid,hostname,service', singleLine: true },
        },
      }),
})
