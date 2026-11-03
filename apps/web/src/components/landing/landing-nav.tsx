'use client'

import { MenuIcon, XIcon } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'
import { LogoMark } from '@/components/logo'
import { ThemeToggle } from '@/components/theme-toggle'
import { Button, buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const LINKS = [
  ['Demo', '#demo'],
  ['Features', '#features'],
  ['Offline', '#offline'],
  ['Pricing', '#pricing'],
  ['FAQ', '#faq'],
] as const

export function LandingNav() {
  const [open, setOpen] = useState(false)
  const close = () => setOpen(false)
  return (
    <header className="sticky top-0 z-20 bg-background px-3 pt-2.5 tablet:px-5 tablet:pt-3.5">
      <nav
        aria-label="Main"
        className="mx-auto flex max-w-310 items-center gap-2 rounded-[18px] border-2 border-border bg-card py-1.5 pr-1.5 pl-3.5 shadow-card tablet:gap-3 tablet:py-2 tablet:pr-2 tablet:pl-4.5"
      >
        <Link href="/" className="flex items-center gap-2 font-display text-[21px] font-extrabold">
          <LogoMark className="size-7.5" />
          keepmint
        </Link>
        <div className="hidden flex-1 justify-center gap-7 font-medium min-[961px]:flex">
          {LINKS.map(([label, href]) => (
            <a
              key={href}
              href={href}
              className="underline-offset-[6px] decoration-2 hover:underline"
            >
              {label}
            </a>
          ))}
        </div>
        <span className="flex-1 min-[961px]:hidden" />
        <ThemeToggle />
        <Link
          href="/login"
          className="hidden rounded-[10px] px-3 py-2.5 font-semibold hover:bg-muted min-[641px]:inline-flex"
        >
          Log in
        </Link>
        <Link href="/signup" className={cn(buttonVariants(), 'hidden min-[641px]:inline-flex')}>
          Start free
        </Link>
        <Button
          variant="outline"
          size="icon"
          aria-label="Menu"
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
          className="min-[961px]:hidden"
        >
          {open ? <XIcon aria-hidden /> : <MenuIcon aria-hidden />}
        </Button>
      </nav>
      {open && (
        <div className="mx-auto mt-2.5 flex max-w-310 animate-pop flex-col rounded-[18px] border-2 border-border bg-card p-2.5 text-lg font-bold shadow-card min-[961px]:hidden">
          {LINKS.map(([label, href]) => (
            <a key={href} href={href} onClick={close} className="rounded-xl p-3.5 hover:bg-muted">
              {label}
            </a>
          ))}
          <Link
            href="/login"
            onClick={close}
            className="rounded-xl p-3.5 text-muted-foreground hover:bg-muted"
          >
            Log in
          </Link>
          <Link
            href="/signup"
            onClick={close}
            className={cn(buttonVariants({ size: 'lg' }), 'm-1 mt-2')}
          >
            Start free
          </Link>
        </div>
      )}
    </header>
  )
}
