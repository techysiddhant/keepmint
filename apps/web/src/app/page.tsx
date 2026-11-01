import Link from 'next/link'
import { LogoMark } from '@/components/logo'
import { ThemeToggle } from '@/components/theme-toggle'
import { Button } from '@/components/ui/button'

// Placeholder until the beta landing page is built in Phase 1.
export default function Home() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-3xl flex-col justify-center gap-8 px-4 py-16">
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-2.5 font-display text-xl font-extrabold">
          <LogoMark />
          keepmint
        </span>
        <ThemeToggle />
      </div>
      <h1 className="font-display text-[clamp(40px,8vw,72px)] leading-none font-extrabold tracking-tight">
        Your links,{' '}
        <span className="inline-block -rotate-2 rounded-xl border-2 border-border bg-yellow px-3 text-sticker-ink">
          sorted
        </span>{' '}
        by AI.
      </h1>
      <p className="max-w-xl text-lg text-muted">
        Drop in any link — a video, a thread, a recipe, a repo. Keepmint reads it, sums it up and
        files it into the right collection. Even offline.
      </p>
      <div className="flex flex-wrap gap-3">
        <Button asChild size="lg">
          <Link href="/app">Open the app shell</Link>
        </Button>
      </div>
    </main>
  )
}
