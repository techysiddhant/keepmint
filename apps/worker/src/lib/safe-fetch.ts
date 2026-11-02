import { lookup as dnsLookup, type LookupAddress } from 'node:dns'
import { BlockList, isIP, type LookupFunction } from 'node:net'
import { Agent, fetch } from 'undici'

/**
 * Fetching user-supplied URLs from a server is a classic SSRF hole: a link to
 * http://169.254.169.254/ or http://localhost:5432 would make the worker read our own
 * network. Every address a hostname resolves to is checked at connect time (so DNS
 * rebinding can't swap in a private one after the check), literal IPs are checked before
 * the request, only ports 80/443 are allowed, and each redirect hop is checked again.
 */
const blocked = new BlockList()
for (const [net, prefix] of [
  ['0.0.0.0', 8],
  ['10.0.0.0', 8],
  ['100.64.0.0', 10],
  ['127.0.0.0', 8],
  ['169.254.0.0', 16],
  ['172.16.0.0', 12],
  ['192.0.0.0', 24],
  ['192.0.2.0', 24],
  ['192.168.0.0', 16],
  ['198.18.0.0', 15],
  ['198.51.100.0', 24],
  ['203.0.113.0', 24],
  ['224.0.0.0', 4],
  ['240.0.0.0', 4],
] as const) {
  blocked.addSubnet(net, prefix, 'ipv4')
}
for (const [net, prefix] of [
  ['::', 128],
  ['::1', 128],
  ['64:ff9b::', 96],
  ['100::', 64],
  ['2001:db8::', 32],
  ['fc00::', 7],
  ['fe80::', 10],
  ['ff00::', 8],
] as const) {
  blocked.addSubnet(net, prefix, 'ipv6')
}

export function isPublicAddress(address: string): boolean {
  const family = isIP(address)
  if (family === 0) return false
  // IPv4-mapped IPv6 (::ffff:10.0.0.1) is checked as the IPv4 address it wraps.
  const mapped = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/i.exec(address)?.[1]
  if (mapped) return !blocked.check(mapped, 'ipv4')
  return !blocked.check(address, family === 6 ? 'ipv6' : 'ipv4')
}

export class BlockedUrlError extends Error {}

const safeLookup: LookupFunction = (hostname, options, callback) => {
  dnsLookup(hostname, { ...options, all: true }, (err, addresses: LookupAddress[]) => {
    if (err) return callback(err, '', 0)
    const bad = addresses.find((a) => !isPublicAddress(a.address))
    if (bad || addresses.length === 0) {
      return callback(new BlockedUrlError(`${hostname} resolves to a private address`), '', 0)
    }
    if (options.all) return callback(null, addresses)
    const first = addresses[0] as LookupAddress
    callback(null, first.address, first.family)
  })
}

const agent = new Agent({
  connect: { lookup: safeLookup, timeout: 5_000 },
  headersTimeout: 10_000,
  bodyTimeout: 10_000,
})

export const USER_AGENT =
  'Mozilla/5.0 (compatible; KeepmintBot/1.0; +https://keepmint.store/bot) like Chrome/130'

function checkUrl(url: URL) {
  if (url.protocol !== 'https:' && url.protocol !== 'http:') {
    throw new BlockedUrlError(`Unsupported protocol ${url.protocol}`)
  }
  if (url.port && url.port !== '80' && url.port !== '443') {
    throw new BlockedUrlError(`Port ${url.port} is not allowed`)
  }
  if (url.username || url.password) throw new BlockedUrlError('Credentials in URL')
  const host = url.hostname.replace(/^\[|\]$/g, '')
  // Literal IPs never go through DNS lookup, so check them here.
  if (isIP(host) && !isPublicAddress(host)) throw new BlockedUrlError(`${host} is private`)
  if (host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.internal')) {
    throw new BlockedUrlError(`${host} is private`)
  }
}

/**
 * Decodes with the charset from the Content-Type header, else from the page's own
 * `<meta charset>` / `http-equiv` tag (first 2 KB), else UTF-8.
 */
function decode(bytes: Buffer, contentType: string) {
  const head = bytes.subarray(0, 2048).toString('latin1')
  const charset =
    /charset=["']?([\w-]+)/i.exec(contentType)?.[1] ??
    /<meta[^>]+charset=["']?([\w-]+)/i.exec(head)?.[1] ??
    'utf-8'
  try {
    return new TextDecoder(charset).decode(bytes)
  } catch {
    return new TextDecoder().decode(bytes)
  }
}

export type FetchedPage = {
  url: string
  status: number
  contentType: string
  body: string
  truncated: boolean
}

export type SafeFetchOptions = {
  accept?: string
  maxBytes?: number
  timeoutMs?: number
  maxRedirects?: number
}

/** GET a public URL with SSRF checks, a size cap and an overall timeout. */
export async function safeFetch(rawUrl: string, opts: SafeFetchOptions = {}): Promise<FetchedPage> {
  const {
    accept = 'text/html,application/xhtml+xml;q=0.9,*/*;q=0.5',
    maxBytes = 2_000_000,
    timeoutMs = 10_000,
    maxRedirects = 5,
  } = opts
  const signal = AbortSignal.timeout(timeoutMs)
  let url = new URL(rawUrl)

  for (let hop = 0; ; hop++) {
    checkUrl(url)
    const res = await fetch(url, {
      dispatcher: agent,
      redirect: 'manual',
      signal,
      headers: { 'user-agent': USER_AGENT, accept, 'accept-language': 'en;q=0.9,*;q=0.5' },
    })
    const location = res.headers.get('location')
    if (res.status >= 300 && res.status < 400 && location) {
      await res.body?.cancel()
      if (hop >= maxRedirects) throw new BlockedUrlError('Too many redirects')
      url = new URL(location, url)
      continue
    }

    const contentType = res.headers.get('content-type') ?? ''
    let received = 0
    let truncated = false
    const chunks: Uint8Array[] = []
    if (res.body) {
      for await (const chunk of res.body) {
        const bytes = chunk as Uint8Array
        if (received + bytes.byteLength > maxBytes) {
          chunks.push(bytes.subarray(0, maxBytes - received))
          truncated = true
          break
        }
        chunks.push(bytes)
        received += bytes.byteLength
      }
    }
    const bytes = Buffer.concat(chunks)
    return {
      url: url.toString(),
      status: res.status,
      contentType,
      body: decode(bytes, contentType),
      truncated,
    }
  }
}

/** JSON from a fixed, trusted endpoint (oEmbed). Still goes through the same checks. */
export async function safeFetchJson<T>(url: string): Promise<T | null> {
  try {
    const res = await safeFetch(url, { accept: 'application/json', maxBytes: 200_000 })
    if (res.status !== 200) return null
    return JSON.parse(res.body) as T
  } catch {
    return null
  }
}
