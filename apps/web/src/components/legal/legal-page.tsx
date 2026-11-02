import { LEGAL_VERSION } from '@keepmint/core'
import Link from 'next/link'
import type { ReactNode } from 'react'
import { LogoMark } from '@/components/logo'
import { ThemeToggle } from '@/components/theme-toggle'

// The date users consent to at sign-up (LEGAL_VERSION) is the date shown here.
const UPDATED = new Date(`${LEGAL_VERSION}T00:00:00Z`).toLocaleDateString('en-GB', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
})

/** Plain reading layout for Privacy and Terms. */
export function LegalPage({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="min-h-dvh">
      <header className="mx-auto flex max-w-3xl items-center justify-between px-5 py-5">
        <Link href="/" className="flex items-center gap-2 font-display text-xl font-extrabold">
          <LogoMark className="size-[30px]" />
          keepmint
        </Link>
        <ThemeToggle />
      </header>
      <main className="mx-auto max-w-3xl px-5 pt-6 pb-24">
        <h1 className="font-display text-[clamp(32px,5vw,48px)] leading-tight font-extrabold tracking-[-0.03em]">
          {title}
        </h1>
        <p className="mt-2 text-muted-foreground">Last updated {UPDATED}</p>
        <div className="mt-10 flex flex-col gap-8 text-[17px] leading-relaxed [&_a]:font-semibold [&_a]:underline [&_a]:underline-offset-[3px] [&_h2]:mb-2 [&_h2]:font-display [&_h2]:text-xl [&_h2]:font-bold [&_li]:ml-5 [&_li]:list-disc [&_ul]:flex [&_ul]:flex-col [&_ul]:gap-1.5">
          {children}
        </div>
      </main>
    </div>
  )
}
