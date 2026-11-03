import Link from 'next/link'
import type { ReactNode } from 'react'
import { LogoMark } from '@/components/logo'
import { ThemeToggle } from '@/components/theme-toggle'

const STICKERS = [
  {
    col: 'Kitchen',
    title: 'Crispy chili oil, three ways',
    note: 'Key step at 4:10 — steep low first.',
    cls: 'left-0 top-7.5 w-70 bg-pink rotate-[-5deg]',
    delay: '0s',
  },
  {
    col: 'Rust & systems',
    title: 'How the async executor polls',
    note: 'Toy executor explains wakers. 14 min.',
    cls: 'left-57.5 top-0 w-67.5 bg-yellow rotate-[4deg]',
    delay: '1.2s',
  },
  {
    col: 'Side projects',
    title: 'tokio-rs / mini-redis',
    note: '',
    cls: 'left-27.5 top-37.5 w-65 bg-mint -rotate-2',
    delay: '2.2s',
  },
]

function SortedWord({ big }: { big?: boolean }) {
  return (
    <span
      className={`inline-block -rotate-2 border-sticker-ink bg-yellow text-sticker-ink ${big ? 'rounded-2xl border-[3px] px-3' : 'rounded-[10px] border-2 px-2'}`}
    >
      sorted
    </span>
  )
}

/** Brand panel (desktop) or brand band (tablet / phone) beside every auth screen. */
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col desktop:flex-row">
      <aside
        aria-label="About Keepmint"
        className="relative hidden min-w-0 flex-1 flex-col justify-between gap-10 overflow-hidden border-r-[3px] border-sticker-ink bg-brand px-14 py-10 text-white desktop:flex"
      >
        <Link
          href="/"
          className="flex items-center gap-2.5 self-start font-display text-[22px] font-extrabold"
        >
          <LogoMark className="size-8.5 rounded-[10px] border-sticker-ink" />
          keepmint
        </Link>
        <div className="flex max-w-130 flex-col gap-5">
          <span className="font-display text-[clamp(36px,3.6vw,54px)] leading-[1.05] font-extrabold tracking-[-0.03em]">
            Your links,
            <br />
            <SortedWord big /> by AI.
          </span>
          <span className="max-w-110 text-lg text-brand-soft">
            Save anything with a link. Keepmint reads it, sums it up and files it into the right
            collection — online or off.
          </span>
        </div>
        <div aria-hidden className="relative h-65">
          {STICKERS.map((s) => (
            <div
              key={s.col}
              style={{ animationDelay: s.delay }}
              className={`absolute animate-floaty rounded-2xl border-2 border-sticker-ink p-4 text-sticker-ink shadow-[5px_5px_0_#111] ${s.cls}`}
            >
              <span className="rounded-full border-2 border-sticker-ink bg-white px-2 py-0.5 text-xs font-bold">
                {s.col}
              </span>
              <div className="mt-2 font-display text-[15px] font-bold">{s.title}</div>
              {s.note && <div className="text-[13px]">{s.note}</div>}
            </div>
          ))}
        </div>
        <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm font-semibold text-brand-soft">
          <span>✓ Works offline</span>
          <span>✓ Light &amp; dark</span>
          <span>✓ Public beta</span>
        </div>
      </aside>

      <header className="flex flex-col gap-4 border-b-[3px] border-sticker-ink bg-brand px-5 pt-4.5 pb-5.5 text-white desktop:hidden">
        <div className="flex items-center justify-between gap-3">
          <Link href="/" className="flex items-center gap-2 font-display text-xl font-extrabold">
            <LogoMark className="size-7.5 border-sticker-ink" />
            keepmint
          </Link>
          <ThemeToggle />
        </div>
        <span className="font-display text-[26px] leading-[1.1] font-extrabold tracking-[-0.02em]">
          Your links, <SortedWord /> by AI.
        </span>
      </header>

      <main className="flex min-w-0 flex-1 flex-col px-4 py-6 tablet:px-10 desktop:py-7">
        <div className="hidden items-center justify-end gap-3 desktop:flex">
          <a
            href="mailto:hello@keepmint.store"
            className="rounded-[10px] px-3 py-2.5 font-semibold text-muted-foreground hover:bg-muted"
          >
            Need help?
          </a>
          <ThemeToggle />
        </div>
        <div className="flex flex-1 items-center justify-center py-6">
          <div className="flex w-full max-w-110 flex-col gap-5.5">{children}</div>
        </div>
        <p className="text-center text-sm text-muted-foreground">
          © 2026 Keepmint ·{' '}
          <Link href="/privacy" className="underline underline-offset-[3px]">
            Privacy
          </Link>{' '}
          ·{' '}
          <Link href="/terms" className="underline underline-offset-[3px]">
            Terms
          </Link>
        </p>
      </main>
    </div>
  )
}
