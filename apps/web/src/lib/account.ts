import 'server-only'
import { session, user } from '@keepmint/db'
import { and, eq, isNull } from 'drizzle-orm'
import { getDb } from './db'

/**
 * Closes an account without deleting anything: stamps user.deleted_at and signs the user
 * out everywhere. Their links, collections, consent records and audit history stay in the
 * database. Used by Settings → Delete account (Phase 5) and the admin (Phase 6).
 */
export async function softDeleteUser(userId: string) {
  const db = getDb()
  return db.transaction(async (tx) => {
    const [closed] = await tx
      .update(user)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(and(eq(user.id, userId), isNull(user.deletedAt)))
      .returning({ id: user.id })
    // Sessions are login tokens, not user data, so removing them is safe.
    await tx.delete(session).where(eq(session.userId, userId))
    return Boolean(closed)
  })
}

/** Reopens a soft-deleted account (admin only, or on the user's request). */
export async function restoreUser(userId: string) {
  const [reopened] = await getDb()
    .update(user)
    .set({ deletedAt: null, updatedAt: new Date() })
    .where(eq(user.id, userId))
    .returning({ id: user.id })
  return Boolean(reopened)
}
