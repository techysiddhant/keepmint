'use client'

import { MailIcon } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { Button, buttonVariants } from '@/components/ui/button'
import { authClient } from '@/lib/auth-client'
import { cn } from '@/lib/utils'
import { AuthCard, mailAppUrl } from './auth-ui'

const STEPS: Array<[string, string]> = [
  ['bg-yellow', 'Open the email from Keepmint'],
  ['bg-pink', 'Tap “Verify my email”'],
  ['bg-mint', 'You’ll land back here, logged in'],
]
const COOLDOWN = 60

export function VerifyPending({ email }: { email: string }) {
  const [wait, setWait] = useState(0)
  const [sent, setSent] = useState(false)
  const inbox = mailAppUrl(email)

  useEffect(() => {
    if (!wait) return
    const t = setTimeout(() => setWait((w) => w - 1), 1000)
    return () => clearTimeout(t)
  }, [wait])

  async function resend() {
    if (!email || wait) return
    setWait(COOLDOWN)
    const { error } = await authClient.sendVerificationEmail({ email, callbackURL: '/verified' })
    setSent(!error)
  }

  return (
    <AuthCard role="status" className="flex flex-col gap-[18px]">
      <div className="relative self-start">
        <span
          aria-hidden
          className="flex size-[72px] items-center justify-center rounded-[20px] border-2 border-border bg-yellow text-sticker-ink"
        >
          <MailIcon className="size-8" />
        </span>
        <span
          aria-hidden
          className="absolute -top-2 -right-2.5 flex h-[26px] min-w-[26px] items-center justify-center rounded-full border-2 border-border bg-pink px-1.5 text-xs font-bold text-sticker-ink"
        >
          1
        </span>
      </div>
      <h1 className="font-display text-[clamp(26px,3vw,32px)] leading-[1.1] font-extrabold tracking-[-0.03em]">
        Verify your email
      </h1>
      <p className="text-muted-foreground">
        We sent a verification link to{' '}
        {email ? <strong className="text-foreground">{email}</strong> : 'your inbox'}. Open it on
        any device to confirm your account.
      </p>
      <ol className="flex flex-col gap-2.5 rounded-[14px] border-2 border-dashed border-line px-4 py-3.5">
        {STEPS.map(([bg, text], i) => (
          <li key={text} className="flex items-center gap-2.5">
            <span
              aria-hidden
              className={`flex size-6 shrink-0 items-center justify-center rounded-full border-2 border-border text-xs font-bold text-sticker-ink ${bg}`}
            >
              {i + 1}
            </span>
            {text}
          </li>
        ))}
      </ol>
      <div className="mt-0.5 flex flex-wrap gap-2.5">
        {inbox && (
          <a
            href={inbox}
            target="_blank"
            rel="noreferrer"
            className={cn(buttonVariants(), 'h-auto flex-[1_1_160px] py-3.5')}
          >
            Open my email
          </a>
        )}
        <Button
          variant="secondary"
          className="h-auto flex-[1_1_140px] py-3.5"
          onClick={resend}
          disabled={!!wait || !email}
        >
          {wait ? (sent ? `Sent again ✓ (${wait}s)` : `Sending… (${wait}s)`) : 'Resend email'}
        </Button>
      </div>
      <p className="text-sm text-muted-foreground">
        Can’t find it? Check spam or promotions. Wrong address?{' '}
        <Link
          href="/signup"
          className="font-bold text-foreground underline decoration-2 underline-offset-[3px]"
        >
          Change email
        </Link>
      </p>
    </AuthCard>
  )
}
