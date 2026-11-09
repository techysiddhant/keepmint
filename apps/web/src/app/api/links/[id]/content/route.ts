import { isUuid, type PageContentResponse } from '@keepmint/core'
import { links } from '@keepmint/db'
import { and, eq, isNull } from 'drizzle-orm'
import { getDb } from '@/lib/db'
import { readPageCopy } from '@/lib/page-copy'
import { getSession } from '@/lib/session'

export const dynamic = 'force-dynamic'

/** The stored page copy for one of the user's links, for the reader. */
export async function GET(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return Response.json({ error: 'unauthorized' }, { status: 401 })
  const { id } = await ctx.params
  if (!isUuid(id)) return Response.json({ error: 'not_found' }, { status: 404 })

  const [link] = await getDb()
    .select({ contentKey: links.contentKey })
    .from(links)
    .where(and(eq(links.id, id), eq(links.userId, session.user.id), isNull(links.deletedAt)))
  if (!link) return Response.json({ error: 'not_found' }, { status: 404 })

  let body: PageContentResponse
  if (!link.contentKey) {
    body = { paragraphs: null, reason: 'Keepmint didn’t keep a copy of this page.' }
  } else {
    const paragraphs = await readPageCopy(link.contentKey).catch(() => null)
    body = paragraphs?.length
      ? { paragraphs }
      : { paragraphs: null, reason: 'The saved copy isn’t available right now.' }
  }
  // Private to this user. A copy never changes, but "not available" may only be a passing failure.
  return Response.json(body, {
    headers: { 'cache-control': body.paragraphs ? 'private, max-age=3600' : 'no-store' },
  })
}
