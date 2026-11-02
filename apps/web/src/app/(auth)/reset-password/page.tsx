import type { Metadata } from 'next'
import { ExpiredLink } from '@/components/auth/expired-link'
import { ResetForm } from '@/components/auth/reset-form'

type Props = { searchParams: Promise<{ token?: string; error?: string }> }

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const { token, error } = await searchParams
  return { title: error || !token ? 'Link expired' : 'Choose a new password' }
}

// The email link goes through /api/auth/reset-password/:token, which redirects here
// with ?token=… when valid or ?error=INVALID_TOKEN when it's expired or used.
export default async function ResetPasswordPage({ searchParams }: Props) {
  const { token, error } = await searchParams
  if (error || !token) return <ExpiredLink kind="reset" />
  return <ResetForm token={token} />
}
