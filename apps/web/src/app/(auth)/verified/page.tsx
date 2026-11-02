import { ArrowRightIcon, CheckIcon } from 'lucide-react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { SuccessCard } from '@/components/auth/auth-ui'
import { ExpiredLink } from '@/components/auth/expired-link'

type Props = { searchParams: Promise<{ error?: string }> }

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  return { title: (await searchParams).error ? 'Link expired' : 'Email verified' }
}

// Better Auth sends the verification link here, with ?error=… when the token is bad or old.
export default async function VerifiedPage({ searchParams }: Props) {
  const { error } = await searchParams
  if (error) return <ExpiredLink kind="verify" />
  return (
    <SuccessCard icon={<CheckIcon className="size-8" aria-hidden />} title="Email verified!">
      <p>Thanks for confirming. Your account is all set.</p>
      <Link
        href="/app"
        className="mt-1 inline-flex items-center gap-2.5 self-start rounded-[14px] border-2 border-sticker-ink bg-white px-5 py-3.5 font-bold shadow-[4px_4px_0_#111]"
      >
        Open my library <ArrowRightIcon className="size-[18px]" aria-hidden />
      </Link>
    </SuccessCard>
  )
}
