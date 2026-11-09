import type { SearchResponse } from '@keepmint/core'
import { links } from '@keepmint/db'
import { and, desc, eq, isNull, sql } from 'drizzle-orm'
import { getDb } from '@/lib/db'
import { getSession } from '@/lib/session'

export const dynamic = 'force-dynamic'

/**
 * Words → a prefix tsquery ("noodle vid" → 'noodle':* & 'vid':*), so results appear while
 * typing. Only letters and digits survive, so user input can't inject tsquery syntax.
 */
function toPrefixQuery(q: string) {
  return q
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter(Boolean)
    .slice(0, 8)
    .map((w) => `${w}:*`)
    .join(' & ')
}

/** Full-text search over the user's links (title, summary, tags, note, site). */
export async function GET(request: Request) {
  const session = await getSession()
  if (!session) return Response.json({ error: 'unauthorized' }, { status: 401 })

  const query = toPrefixQuery(new URL(request.url).searchParams.get('q') ?? '')
  if (!query) return Response.json({ ids: [] } satisfies SearchResponse)

  const tsq = sql`to_tsquery('simple', ${query})`
  const rows = await getDb()
    .select({ id: links.id })
    .from(links)
    .where(
      and(
        eq(links.userId, session.user.id),
        isNull(links.deletedAt),
        sql`${links.search} @@ ${tsq}`,
      ),
    )
    .orderBy(desc(sql`ts_rank(${links.search}, ${tsq})`), desc(links.savedAt))
    .limit(200)
  return Response.json({ ids: rows.map((r) => r.id) } satisfies SearchResponse, {
    headers: { 'cache-control': 'no-store' },
  })
}
