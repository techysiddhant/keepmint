import type { Metadata } from 'next'
import { AuthForm } from '@/components/auth/auth-form'
import { redirectIfSignedIn } from '@/lib/session'

export const metadata: Metadata = { title: 'Log in' }

// Only same-site paths, so ?next= can't send someone to another website. Resolving against a
// fixed origin catches tricks like `//evil.com` and `/\evil.com` (browsers read `\` as `/`).
const TRUSTED = 'https://keepmint.invalid'
function safeNext(next?: string) {
  if (!next?.startsWith('/')) return '/app'
  try {
    const url = new URL(next, TRUSTED)
    return url.origin === TRUSTED ? url.pathname + url.search + url.hash : '/app'
  } catch {
    return '/app'
  }
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>
}) {
  const { next } = await searchParams
  await redirectIfSignedIn(safeNext(next))
  return <AuthForm mode="login" next={safeNext(next)} />
}
