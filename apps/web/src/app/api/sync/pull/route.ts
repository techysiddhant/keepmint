import { getSession } from '@/lib/session'
import { pullChanges } from '@/lib/sync'

export const dynamic = 'force-dynamic'

/** Everything that changed after `?since=<server_version>`, deletes included. */
export async function GET(request: Request) {
  const session = await getSession()
  if (!session) return Response.json({ error: 'unauthorized' }, { status: 401 })

  const since = Number(new URL(request.url).searchParams.get('since') ?? 0)
  if (!Number.isSafeInteger(since) || since < 0) {
    return Response.json({ error: 'invalid_since' }, { status: 400 })
  }
  return Response.json(await pullChanges(session.user.id, since), {
    headers: { 'cache-control': 'no-store' },
  })
}
