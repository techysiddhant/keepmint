import 'server-only'
import { headers } from 'next/headers'
import { notFound, redirect } from 'next/navigation'
import { cache } from 'react'
import { getAuth } from './auth'

/** The signed-in session for this request (deduplicated across layouts and pages). */
export const getSession = cache(async () => {
  const session = await getAuth().api.getSession({ headers: await headers() })
  return session?.user.deletedAt ? null : session
})

export async function requireUser() {
  // getSession already treats closed (soft-deleted) accounts as signed out.
  const session = await getSession()
  if (!session) redirect('/login')
  return session.user
}

/** Admin pages 404 for everyone else, so their existence isn't revealed. */
export async function requireAdmin() {
  const user = await requireUser()
  if (user.role !== 'admin' && user.role !== 'owner') notFound()
  return user
}

/** Login and sign-up pages: skip them when the user already has a valid session. */
export async function redirectIfSignedIn(to = '/app') {
  if (await getSession()) redirect(to)
}
