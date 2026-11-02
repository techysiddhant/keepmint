import { detectTypeFromHost, type LinkType } from '@keepmint/core'
import { Readability } from '@mozilla/readability'
import { parseHTML } from 'linkedom'
import { BlockedUrlError, safeFetch, safeFetchJson } from './safe-fetch'

/** Everything the AI (and the link card) needs about a page, read without any AI. */
export type PageRead = {
  finalUrl: string
  site: string
  title: string
  description: string | null
  imageUrl: string | null
  /** Set in code for known hosts; otherwise the AI picks. */
  type: LinkType | null
  /** Clean readable text (may be empty for videos and threads). */
  text: string
  /** Headings from the article, used to build a compact AI input. */
  headings: string[]
}

export type ReadOutcome = { ok: true; page: PageRead } | { ok: false; reason: string }

const FAIL = {
  blocked: 'Keepmint can’t open this address.',
  network: 'Couldn’t reach this page. Check the link and try again.',
  notFound: 'This page doesn’t exist (404). Check the link.',
  login: 'Couldn’t read this page — it may need a login.',
  blockedBySite: 'This site blocks automated reading, so Keepmint couldn’t summarise it.',
  status: (s: number) => `The site refused the request (error ${s}).`,
  type: 'This link isn’t a web page Keepmint can read yet.',
  pdf: 'Keepmint can’t read PDFs yet. The link is saved.',
  empty: 'Couldn’t find anything to read on this page.',
} as const

const clean = (s: string | null | undefined, max = 500) =>
  s?.replace(/\s+/g, ' ').trim().slice(0, max) || null

function siteOf(url: URL) {
  return url.hostname.replace(/^www\./, '')
}

function absolute(href: string | null | undefined, base: string) {
  if (!href) return null
  try {
    const url = new URL(href, base)
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.toString() : null
  } catch {
    return null
  }
}

/** Title / description / image from Open Graph, Twitter cards and plain tags. */
function readMeta(document: Document, base: string) {
  const meta = (...names: string[]) => {
    for (const name of names) {
      const el =
        document.querySelector(`meta[property="${name}"]`) ??
        document.querySelector(`meta[name="${name}"]`)
      const value = el?.getAttribute('content')
      if (value?.trim()) return value
    }
    return null
  }
  return {
    title: clean(
      meta('og:title', 'twitter:title') ?? document.querySelector('title')?.textContent,
      300,
    ),
    description: clean(meta('og:description', 'twitter:description', 'description'), 600),
    imageUrl: absolute(meta('og:image', 'og:image:url', 'twitter:image'), base),
    siteName: clean(meta('og:site_name'), 80),
  }
}

/**
 * Signs of a login page rather than the content itself: almost no text plus a password
 * field, or a title that *starts* with "Log in" / "Sign in" on a page with little text.
 * A title merely mentioning sign-in ("Implementing Sign in with Apple") is not enough,
 * and neither is a header login form on a real article.
 */
function looksLikeLoginWall(document: Document, text: string) {
  const hasPassword = Boolean(document.querySelector('input[type="password"]'))
  const title = document.querySelector('title')?.textContent?.trim() ?? ''
  const loginTitle = /^(log ?in|sign ?in)\b/i.test(title)
  return (hasPassword && text.length < 500) || (loginTitle && text.length < 1500)
}

/** linkedom needs a full document; some pages skip `<html>`/`<body>`. */
function parseDocument(html: string) {
  const full = /<body[\s>]/i.test(html) ? html : `<!doctype html><html><body>${html}</body></html>`
  return parseHTML(full).document as unknown as Document
}

function extractReadable(html: string, url: string) {
  const document = parseDocument(html)
  const meta = readMeta(document, url)
  // Readability mutates the DOM, so read headings and the fallback text from a separate parse.
  const copy = parseDocument(html)
  const headings = [...copy.querySelectorAll('h1, h2, h3')]
    .map((h) => clean(h.textContent, 120))
    .filter((h): h is string => Boolean(h))
    .slice(0, 15)
  let article: ReturnType<Readability['parse']> = null
  try {
    article = new Readability(document, { charThreshold: 300 }).parse()
  } catch {
    // Readability can throw on unusual markup; the plain body text below is good enough.
  }
  for (const el of copy.querySelectorAll('script, style, noscript, nav, footer')) el.remove()
  const raw = article?.textContent || copy.body?.textContent || ''
  const text = raw
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
  return { document, meta, headings, text, articleTitle: clean(article?.title, 300) }
}

type OEmbed = { title?: string; author_name?: string; html?: string; thumbnail_url?: string }

/** YouTube: oEmbed for title/channel, the page's meta description for the rest. */
async function readYouTube(url: URL): Promise<PageRead | null> {
  const oembed = await safeFetchJson<OEmbed>(
    `https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(url.toString())}`,
  )
  if (!oembed?.title) return null
  let description: string | null = null
  try {
    const page = await safeFetch(url.toString(), { maxBytes: 1_500_000 })
    if (page.status === 200)
      description = readMeta(
        parseHTML(page.body).document as unknown as Document,
        page.url,
      ).description
  } catch {}
  return {
    finalUrl: url.toString(),
    site: 'youtube.com',
    title: clean(oembed.title, 300) ?? 'YouTube video',
    description,
    imageUrl: oembed.thumbnail_url ?? null,
    type: 'video',
    text: [oembed.author_name && `Channel: ${oembed.author_name}`, description]
      .filter(Boolean)
      .join('\n'),
    headings: [],
  }
}

/** X / Twitter pages need JavaScript; their oEmbed returns the post text. */
async function readXPost(url: URL): Promise<PageRead | null> {
  const oembed = await safeFetchJson<OEmbed>(
    `https://publish.twitter.com/oembed?omit_script=true&url=${encodeURIComponent(url.toString())}`,
  )
  if (!oembed?.html) return null
  const text = clean(
    parseHTML(`<div>${oembed.html}</div>`).document.querySelector('p')?.textContent,
    2000,
  )
  if (!text) return null
  return {
    finalUrl: url.toString(),
    site: siteOf(url),
    title: `${oembed.author_name ?? 'Post'}: ${text.slice(0, 90)}${text.length > 90 ? '…' : ''}`,
    description: text,
    imageUrl: null,
    type: 'thread',
    text,
    headings: [],
  }
}

/** GitHub repos: the page's description plus the top of the README. */
async function readGitHubReadme(url: URL): Promise<string | null> {
  const [owner, repo] = url.pathname.split('/').filter(Boolean)
  if (!owner || !repo || url.hostname.replace(/^www\./, '') !== 'github.com') return null
  try {
    const res = await safeFetch(
      `https://raw.githubusercontent.com/${owner}/${repo}/HEAD/README.md`,
      {
        accept: 'text/plain',
        maxBytes: 60_000,
      },
    )
    return res.status === 200 ? res.body : null
  } catch {
    return null
  }
}

/** A single YouTube video (not a channel, playlist or search page). */
function isYouTubeVideo(url: URL) {
  const host = siteOf(url)
  if (host === 'youtu.be') return url.pathname.length > 1
  return (
    /(^|\.)youtube\.com$/.test(host) &&
    ((url.pathname === '/watch' && url.searchParams.has('v')) ||
      /^\/(shorts|live|embed)\/[\w-]+/.test(url.pathname))
  )
}

/** Reads a link. Anything that fails here ends as `failed` — no AI is spent on it. */
export async function readPage(rawUrl: string): Promise<ReadOutcome> {
  const url = new URL(rawUrl)
  const hostType = detectTypeFromHost(url)
  const host = siteOf(url)

  if (isYouTubeVideo(url)) {
    const page = await readYouTube(url)
    if (page) return { ok: true, page }
    // oEmbed has nothing for removed, private or made-up video ids.
    return { ok: false, reason: 'This video is unavailable or private.' }
  }
  if (hostType === 'thread' && /(^|\.)(x\.com|twitter\.com)$/.test(host)) {
    const page = await readXPost(url)
    if (page) return { ok: true, page }
    return { ok: false, reason: 'Couldn’t read this post — it may be private or deleted.' }
  }

  let res: Awaited<ReturnType<typeof safeFetch>>
  try {
    res = await safeFetch(url.toString())
  } catch (err) {
    // undici wraps errors from the DNS check in a TypeError('fetch failed').
    const blocked =
      err instanceof BlockedUrlError || (err as Error).cause instanceof BlockedUrlError
    return { ok: false, reason: blocked ? FAIL.blocked : FAIL.network }
  }
  if (res.status === 404 || res.status === 410) return { ok: false, reason: FAIL.notFound }
  if (res.status === 401) return { ok: false, reason: FAIL.login }
  if (res.status === 403 || res.status === 429) return { ok: false, reason: FAIL.blockedBySite }
  if (res.status >= 400) return { ok: false, reason: FAIL.status(res.status) }
  if (/application\/pdf/i.test(res.contentType) || hostType === 'pdf')
    return { ok: false, reason: FAIL.pdf }
  if (!/html|xml|text\/plain/i.test(res.contentType)) return { ok: false, reason: FAIL.type }

  const final = new URL(res.url)
  const { document, meta, headings, text, articleTitle } = extractReadable(res.body, res.url)
  if (looksLikeLoginWall(document, text)) return { ok: false, reason: FAIL.login }

  let bodyText = text
  if (hostType === 'repo') {
    const readme = await readGitHubReadme(final)
    if (readme) bodyText = readme
  }
  // "GitHub - owner/repo: description" → "owner/repo: description".
  const title = (meta.title ?? articleTitle)?.replace(/^GitHub - /, '') ?? null
  // Videos, repos and threads can be thin on text; their title + description is enough.
  const enough = bodyText.length >= 200 || (hostType !== null && Boolean(title && meta.description))
  if (!title || !enough) return { ok: false, reason: FAIL.empty }

  return {
    ok: true,
    page: {
      finalUrl: res.url,
      site: siteOf(final),
      title,
      description: meta.description,
      imageUrl: meta.imageUrl,
      type: hostType,
      text: bodyText,
      headings,
    },
  }
}

/** Words → minutes at ~230 wpm, for when the AI doesn't say. */
export function estimateReadMinutes(text: string) {
  const words = text.split(/\s+/).filter(Boolean).length
  return words >= 150 ? Math.max(1, Math.round(words / 230)) : null
}
