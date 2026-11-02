import { resolve } from 'node:path'
import { type LinkType, urlHash } from '@keepmint/core'
import { config } from 'dotenv'
import { eq, sql } from 'drizzle-orm'
import { createDb } from './client'
import { collections, links, user } from './schema'

config({ path: resolve(import.meta.dirname, '../../../.env'), quiet: true })

// Sample data from the design canvas. Safe to re-run: the demo user is replaced each time.
// Default app_settings come from migration 0001, not from here.

const DEMO_EMAIL = 'siddhant@example.com'

const COLLECTIONS = [
  { key: 'kitchen', name: 'Kitchen', color: 'pink', pinned: true },
  { key: 'rust', name: 'Rust & systems', color: 'yellow', pinned: true },
  { key: 'side', name: 'Side projects', color: 'mint', pinned: false },
  { key: 'design', name: 'Design refs', color: 'lilac', pinned: false },
  { key: 'jobs', name: 'Job hunt', color: 'sky', pinned: false },
] as const

type SeedLink = {
  url: string
  title: string
  summary: string
  type: LinkType
  col: (typeof COLLECTIONS)[number]['key'] | null
  tags: string[]
  minutes?: number
  readLater?: boolean
}

const LINKS: SeedLink[] = [
  {
    url: 'https://youtube.com/watch?v=chili-oil-three-ways',
    title: 'Crispy chili oil, three ways',
    summary: 'Recipe video. Key step at 4:10 — steep aromatics low before the chili.',
    type: 'video',
    col: 'kitchen',
    tags: ['chili', 'recipe'],
    minutes: 12,
  },
  {
    url: 'https://youtube.com/watch?v=hand-pulled-noodles',
    title: 'Hand-pulled noodles for beginners',
    summary: 'Dough, resting and pulling technique, step by step.',
    type: 'video',
    col: 'kitchen',
    tags: ['noodles', 'recipe'],
    minutes: 18,
    readLater: true,
  },
  {
    url: 'https://seriouseats.example/sourdough-starter',
    title: 'A no-fuss sourdough starter',
    summary: 'Seven-day starter schedule with flour ratios and what bubbles to look for.',
    type: 'recipe',
    col: 'kitchen',
    tags: ['baking', 'sourdough'],
    minutes: 9,
  },
  {
    url: 'https://blog.example/async-rust-executor',
    title: 'How the async executor actually polls',
    summary: 'Builds a toy executor to explain wakers and polling. 14 min read.',
    type: 'article',
    col: 'rust',
    tags: ['rust', 'async'],
    minutes: 14,
    readLater: true,
  },
  {
    url: 'https://github.com/tokio-rs/mini-redis',
    title: 'tokio-rs / mini-redis',
    summary: 'A small Redis clone built to teach Tokio.',
    type: 'repo',
    col: 'side',
    tags: ['rust', 'tokio'],
    minutes: 5,
  },
  {
    url: 'https://youtube.com/watch?v=pin-unpin-futures',
    title: "Pin, Unpin and why futures don't move",
    summary: 'Explains self-referential futures and why pinning exists.',
    type: 'video',
    col: 'rust',
    tags: ['rust', 'futures'],
    minutes: 22,
  },
  {
    url: 'https://github.com/denoland/fresh',
    title: 'denoland / fresh',
    summary: 'Island-based web framework for Deno with no build step.',
    type: 'repo',
    col: 'side',
    tags: ['deno', 'framework'],
    minutes: 4,
  },
  {
    url: 'https://news.dev/offline-first-is-back',
    title: 'Offline-first is back',
    summary: 'Why local-first apps are returning and the sync patterns that make them work.',
    type: 'article',
    col: 'side',
    tags: ['offline', 'sync'],
    minutes: 11,
    readLater: true,
  },
  {
    url: 'https://uxdesign.example/9-rules-empty-states',
    title: '9 rules for better empty states',
    summary: 'Explain, guide, then get out of the way — patterns with examples.',
    type: 'article',
    col: 'design',
    tags: ['ux', 'empty-states'],
    minutes: 7,
  },
  {
    url: 'https://dribbble.example/neo-brutalist-dashboards',
    title: 'Neo-brutalist dashboard shots',
    summary: 'Thick borders, hard shadows and loud colour in dashboard UIs.',
    type: 'article',
    col: 'design',
    tags: ['ui', 'inspiration'],
    minutes: 3,
  },
  {
    url: 'https://jobs.example/senior-frontend-remote',
    title: 'Senior Frontend Engineer, remote',
    summary: 'React + TypeScript. Closes Nov 14.',
    type: 'job',
    col: 'jobs',
    tags: ['react', 'remote'],
    minutes: 4,
  },
  {
    url: 'https://jobs.example/fullstack-node-bangalore',
    title: 'Full-stack Engineer (Node), Bengaluru',
    summary: 'Node, Postgres and some infra. Hybrid, 3 days in office.',
    type: 'job',
    col: 'jobs',
    tags: ['node', 'postgres'],
    minutes: 4,
  },
  {
    url: 'https://travelnotes.example/lisbon-in-3-days',
    title: 'Lisbon in 3 days: a slow guide',
    summary: 'Neighbourhood-by-neighbourhood plan with where to eat.',
    type: 'article',
    col: null,
    tags: ['travel', 'lisbon'],
    minutes: 10,
  },
  {
    url: 'https://gearlab.example/quiet-mechanical-keyboards',
    title: 'Best quiet mechanical keyboards',
    summary: 'Tested picks for shared offices, from budget to premium.',
    type: 'product',
    col: null,
    tags: ['keyboards', 'gear'],
    minutes: 8,
  },
  {
    url: 'https://x.com/someone/status/desk-setup-thread',
    title: 'Desk setup thread',
    summary: 'A thread of minimal desk setups with parts lists.',
    type: 'thread',
    col: null,
    tags: ['desk', 'gear'],
    minutes: 3,
  },
]

async function main() {
  const url = process.env.DATABASE_URL
  if (!url) throw new Error('DATABASE_URL is not set (see .env.example)')

  // Guard on where the data goes, not on NODE_ENV (which is unset on a laptop pointed at prod).
  const host = new URL(url).hostname
  const isLocal = ['localhost', '127.0.0.1', '::1'].includes(host)
  if (!isLocal && !process.argv.includes('--allow-remote')) {
    throw new Error(
      `Refusing to seed remote database "${host}". If this is a dev branch, run: pnpm db:seed --allow-remote`,
    )
  }

  const { db, pool } = createDb(url, { max: 1 })
  try {
    await db.transaction(async (tx) => {
      // Users are never hard-deleted in the app (a trigger blocks it). The seed replaces its
      // own demo user, so it opts in to a purge for this transaction only.
      await tx.execute(sql`set local keepmint.allow_purge = 'on'`)
      await tx.delete(user).where(eq(user.email, DEMO_EMAIL))

      const userId = crypto.randomUUID()
      await tx.insert(user).values({
        id: userId,
        name: 'Siddhant',
        email: DEMO_EMAIL,
        emailVerified: true,
        role: 'owner',
        timezone: 'Asia/Kolkata',
      })

      const colIds = Object.fromEntries(COLLECTIONS.map((c) => [c.key, crypto.randomUUID()]))
      await tx.insert(collections).values(
        COLLECTIONS.map((c) => ({
          id: colIds[c.key] as string,
          userId,
          name: c.name,
          color: c.color,
          pinned: c.pinned,
        })),
      )

      const now = Date.now()
      const rows = await Promise.all(
        LINKS.map(async (l, i) => {
          const savedAt = new Date(now - i * 7 * 3600_000)
          return {
            id: crypto.randomUUID(),
            userId,
            url: l.url,
            urlHash: await urlHash(l.url),
            site: new URL(l.url).hostname.replace(/^www\./, ''),
            title: l.title,
            summary: l.summary,
            type: l.type,
            tags: l.tags,
            collectionId: l.col ? (colIds[l.col] ?? null) : null,
            status: l.col ? ('done' as const) : ('needs_review' as const),
            aiConfidence: l.col ? 0.92 : 0.45,
            readMinutes: l.minutes ?? null,
            readLater: l.readLater ?? false,
            readLaterRank: l.readLater ? i : null,
            savedAt,
            processedAt: savedAt,
          }
        }),
      )
      await tx.insert(links).values(rows)
    })
    console.log(
      `Seeded ${COLLECTIONS.length} collections and ${LINKS.length} links for ${DEMO_EMAIL}`,
    )
  } finally {
    await pool.end()
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
