import { AlertCircleIcon, Loader2Icon } from 'lucide-react'
import type { ComponentProps, ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

/** White card with the thick ink border and 6px hard shadow from the auth design. */
export function AuthCard({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      className={cn(
        'animate-pop rounded-3xl border-2 border-border bg-card p-6 shadow-[6px_6px_0_var(--shadow)] tablet:p-8',
        className,
      )}
      {...props}
    />
  )
}

export function AuthHeading({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="mb-[22px] flex flex-col gap-1.5">
      <h1 className="font-display text-[clamp(26px,3vw,32px)] leading-[1.1] font-extrabold tracking-[-0.03em]">
        {title}
      </h1>
      {children && <p className="text-muted-foreground">{children}</p>}
    </div>
  )
}

export function FormAlert({ children }: { children: ReactNode }) {
  return (
    <div
      role="alert"
      className="mb-[18px] flex animate-drop items-start gap-2.5 rounded-xl border-2 border-destructive bg-fail-soft px-3.5 py-3 text-sm font-semibold text-err-ink"
    >
      <AlertCircleIcon className="mt-0.5 size-[18px] shrink-0" aria-hidden />
      <span>{children}</span>
    </div>
  )
}

export function SubmitButton({ loading, children }: { loading: boolean; children: ReactNode }) {
  return (
    <Button
      type="submit"
      size="xl"
      disabled={loading}
      className="w-full disabled:cursor-progress disabled:opacity-100"
    >
      {loading && <Loader2Icon className="animate-spin" aria-hidden />}
      {children}
    </Button>
  )
}

/** Mint "it worked" card (email verified, password updated). */
export function SuccessCard({
  icon,
  title,
  children,
}: {
  icon: ReactNode
  title: string
  children: ReactNode
}) {
  return (
    <div
      role="status"
      className="relative flex animate-pop flex-col gap-4 overflow-hidden rounded-3xl border-2 border-border bg-mint p-6 text-sticker-ink shadow-[6px_6px_0_var(--shadow)] tablet:p-8"
    >
      <span
        aria-hidden
        className="absolute top-[18px] right-[22px] size-[34px] animate-floaty rounded-[10px] border-2 border-sticker-ink bg-yellow"
      />
      <span
        aria-hidden
        className="absolute top-[70px] right-[70px] size-5 animate-floaty rounded-full border-2 border-sticker-ink bg-pink [animation-delay:1.2s]"
      />
      <span className="flex size-16 items-center justify-center rounded-full border-2 border-sticker-ink bg-white">
        {icon}
      </span>
      <h1 className="font-display text-[clamp(26px,3vw,32px)] leading-[1.1] font-extrabold tracking-[-0.03em]">
        {title}
      </h1>
      {children}
    </div>
  )
}

const MAIL_APPS: Array<[RegExp, string]> = [
  [/^(gmail|googlemail)\.com$/, 'https://mail.google.com'],
  [/^(outlook|hotmail|live|msn)\.\w+$/, 'https://outlook.live.com/mail'],
  [/^(yahoo|ymail)\.\w+$/, 'https://mail.yahoo.com'],
  [/^(icloud|me|mac)\.com$/, 'https://www.icloud.com/mail'],
  [/^proton(mail)?\.(me|ch)$/, 'https://mail.proton.me'],
]

/** Web inbox for well-known providers, so "Open my email" can go straight there. */
export function mailAppUrl(email: string): string | null {
  const domain = email.split('@')[1]?.toLowerCase() ?? ''
  return MAIL_APPS.find(([re]) => re.test(domain))?.[1] ?? null
}

/** Maps Better Auth error codes to the design's copy. */
export function authErrorMessage(error: { status?: number; code?: string; message?: string }) {
  if (error.status === 429) return 'Too many attempts. Wait a minute and try again.'
  switch (error.code) {
    case 'INVALID_EMAIL_OR_PASSWORD':
      return 'That email and password don’t match. Try again or reset your password.'
    case 'EMAIL_NOT_VERIFIED':
      return 'Please verify your email first. We’ve just sent you a new link.'
    case 'USER_ALREADY_EXISTS':
    case 'USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL':
      return 'An account with this email already exists. Log in instead.'
    case 'ACCOUNT_DELETED':
      return 'This account has been closed. Contact hello@keepmint.store if you’d like it back.'
    case 'TERMS_NOT_ACCEPTED':
      return 'Please accept the Terms and Privacy Policy to continue.'
    case 'PASSWORD_TOO_SHORT':
      return 'Use at least 8 characters.'
    case 'BANNED_USER':
      return 'This account has been suspended. Contact hello@keepmint.store if you think that’s a mistake.'
    default:
      return 'Something went wrong on our side. Please try again.'
  }
}
