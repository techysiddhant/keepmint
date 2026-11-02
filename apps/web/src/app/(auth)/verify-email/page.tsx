import type { Metadata } from 'next'
import { VerifyPending } from '@/components/auth/verify-pending'

export const metadata: Metadata = { title: 'Verify your email' }

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string }>
}) {
  const { email } = await searchParams
  return <VerifyPending email={email ?? ''} />
}
