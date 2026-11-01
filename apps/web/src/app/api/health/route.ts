import { sql } from 'drizzle-orm'
import { getDb } from '@/lib/db'

export const dynamic = 'force-dynamic'

/** Liveness + database check, used by uptime monitors and the Phase 0 "done when". */
export async function GET() {
  try {
    await getDb().execute(sql`select 1`)
    return Response.json({ ok: true, db: 'up' })
  } catch (err) {
    console.error('health check failed', err)
    return Response.json({ ok: false, db: 'down' }, { status: 503 })
  }
}
