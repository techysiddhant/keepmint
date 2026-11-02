import { syncPushSchema } from '@keepmint/core'
import { sameOrigin } from '@/lib/request'
import { getSession } from '@/lib/session'
import { pushChanges } from '@/lib/sync'

export const dynamic = 'force-dynamic'

/** Creates, updates and soft-deletes links and collections sent from the device. */
export async function POST(request: Request) {
  if (!sameOrigin(request)) return Response.json({ error: 'bad_origin' }, { status: 403 })
  const session = await getSession()
  if (!session) return Response.json({ error: 'unauthorized' }, { status: 401 })

  const body = syncPushSchema.safeParse(await request.json().catch(() => null))
  if (!body.success) return Response.json({ error: 'invalid_body' }, { status: 400 })

  const results = await pushChanges(session.user.id, body.data.changes)
  return Response.json({ results })
}
