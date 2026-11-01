import normalize from 'normalize-url'
import type { LinkType } from './constants'

/** Adds a scheme if missing and checks the result looks like a public web URL. */
export function parseLinkInput(raw: string): URL | null {
  const value = raw.trim()
  if (!value) return null
  try {
    const url = new URL(/^https?:\/\//i.test(value) ? value : `https://${value}`)
    if (!/^https?:$/.test(url.protocol)) return null
    if (!/^([\w-]+\.)+[a-z]{2,}$/i.test(url.hostname)) return null
    return url
  } catch {
    return null
  }
}

/** Canonical form used for dedup and the shared summary cache. */
export function normalizeLinkUrl(raw: string): string {
  return normalize(raw.trim(), {
    defaultProtocol: 'https',
    forceHttps: true,
    stripWWW: true,
    stripHash: true,
    removeTrailingSlash: true,
    removeQueryParameters: [/^utm_\w+/i, 'ref', 'fbclid', 'gclid', 'si'],
    sortQueryParameters: true,
  })
}

/** SHA-256 hex of the normalised URL. Works in the browser and in Node. */
export async function urlHash(raw: string): Promise<string> {
  const bytes = new TextEncoder().encode(normalizeLinkUrl(raw))
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('')
}

const HOST_TYPES: Array<[RegExp, LinkType]> = [
  [/(^|\.)(youtube\.com|youtu\.be|vimeo\.com)$/, 'video'],
  [/(^|\.)(github\.com|gitlab\.com)$/, 'repo'],
  [/(^|\.)(x\.com|twitter\.com|threads\.net|bsky\.app)$/, 'thread'],
]

/** Link type from the host alone, or null when the AI should decide. */
export function detectTypeFromHost(url: URL): LinkType | null {
  const host = url.hostname.replace(/^www\./, '')
  for (const [pattern, type] of HOST_TYPES) if (pattern.test(host)) return type
  if (url.pathname.toLowerCase().endsWith('.pdf')) return 'pdf'
  return null
}
