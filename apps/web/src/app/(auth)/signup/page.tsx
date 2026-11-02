import type { Metadata } from 'next'
import { AuthForm } from '@/components/auth/auth-form'
import { redirectIfSignedIn } from '@/lib/session'

export const metadata: Metadata = { title: 'Sign up' }

export default async function SignupPage() {
  await redirectIfSignedIn()
  return <AuthForm mode="signup" />
}
