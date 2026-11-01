'use client'

import {
  BookmarkIcon,
  FolderIcon,
  HomeIcon,
  LibraryIcon,
  PlusIcon,
  SettingsIcon,
} from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { ReactNode } from 'react'
import { toast } from 'sonner'
import { LogoMark } from '@/components/logo'
import { ThemeToggle } from '@/components/theme-toggle'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

const NAV = [
  { label: 'Dashboard', short: 'Home', href: '/app', icon: HomeIcon },
  { label: 'All links', short: 'All links', href: '/app/links', icon: LibraryIcon },
  { label: 'Collections', short: 'Collections', href: '/app/collections', icon: FolderIcon },
  { label: 'Read later', short: 'Read later', href: '/app/read-later', icon: BookmarkIcon },
] as const

function useIsActive() {
  const pathname = usePathname()
  return (href: string) => (href === '/app' ? pathname === '/app' : pathname.startsWith(href))
}

// Saving arrives in Phase 2.
const openAddLink = () => toast('Adding links arrives in Phase 2')

/** Desktop sidebar (≥1101px), tablet icon rail (601–1100px), phone top bar + bottom tabs. */
export function AppShell({ children }: { children: ReactNode }) {
  const isActive = useIsActive()

  return (
    <div className="flex min-h-dvh flex-col tablet:flex-row">
      {/* Desktop sidebar */}
      <aside
        aria-label="Main navigation"
        className="sticky top-0 hidden h-dvh w-[248px] shrink-0 flex-col gap-5 border-r-2 border-border bg-surface px-4 py-[22px] desktop:flex"
      >
        <Link
          href="/app"
          className="flex items-center gap-2.5 px-1.5 font-display text-[21px] font-extrabold"
        >
          <LogoMark />
          keepmint
        </Link>
        <Button size="lg" className="justify-start" onClick={openAddLink}>
          <PlusIcon aria-hidden strokeWidth={2.8} />
          <span className="flex-1 text-left">Add link</span>
          <kbd className="rounded-md border-[1.5px] border-white/60 px-1.5 text-xs font-bold">
            N
          </kbd>
        </Button>
        <nav className="flex flex-col gap-1">
          {NAV.map(({ label, href, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              aria-current={isActive(href) ? 'page' : undefined}
              className={cn(
                'flex items-center gap-3 rounded-xl border-2 border-transparent px-3 py-2.5 font-bold transition-colors hover:bg-surface-2',
                isActive(href) && 'border-ink bg-surface-2',
              )}
            >
              <Icon className="size-[18px]" aria-hidden strokeWidth={2.2} />
              {label}
            </Link>
          ))}
        </nav>
        <div className="mt-auto flex flex-col gap-1">
          <Link
            href="/app/settings"
            aria-current={isActive('/app/settings') ? 'page' : undefined}
            className={cn(
              'flex items-center gap-3 rounded-xl border-2 border-transparent px-3 py-2.5 font-bold hover:bg-surface-2',
              isActive('/app/settings') && 'border-ink bg-surface-2',
            )}
          >
            <SettingsIcon className="size-[18px]" aria-hidden strokeWidth={2.2} />
            Settings
          </Link>
          <div className="flex items-center gap-2.5 rounded-xl p-2">
            <Avatar />
            <span className="flex flex-col leading-tight">
              <strong>Siddhant</strong>
              <span className="text-[13px] text-muted">Beta</span>
            </span>
          </div>
        </div>
      </aside>

      {/* Tablet icon rail */}
      <aside
        aria-label="Main navigation"
        className="sticky top-0 hidden h-dvh w-20 shrink-0 flex-col items-center gap-3 border-r-2 border-border bg-surface px-3 py-[18px] tablet:flex desktop:hidden"
      >
        <Link href="/app" aria-label="Keepmint home">
          <LogoMark className="size-10 rounded-[11px]" />
        </Link>
        <Button
          size="icon"
          className="my-1.5 size-[50px] rounded-[14px]"
          aria-label="Add link"
          onClick={openAddLink}
        >
          <PlusIcon aria-hidden strokeWidth={2.8} />
        </Button>
        {[
          ...NAV,
          { label: 'Settings', short: 'Settings', href: '/app/settings', icon: SettingsIcon },
        ].map(({ label, href, icon: Icon }) => (
          <Tooltip key={href}>
            <TooltipTrigger asChild>
              <Link
                href={href}
                aria-label={label}
                aria-current={isActive(href) ? 'page' : undefined}
                className={cn(
                  'flex size-12 items-center justify-center rounded-xl border-2 border-transparent hover:bg-surface-2',
                  isActive(href) && 'border-ink bg-surface-2',
                  href === '/app/settings' && 'mt-auto',
                )}
              >
                <Icon className="size-5" aria-hidden strokeWidth={2.2} />
              </Link>
            </TooltipTrigger>
            <TooltipContent side="right">{label}</TooltipContent>
          </Tooltip>
        ))}
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top bar */}
        <header className="sticky top-0 z-10 flex items-center gap-2.5 border-b-2 border-border bg-surface px-4 py-3 tablet:px-6">
          <Link
            href="/app"
            className="flex flex-1 items-center gap-2 font-display text-[19px] font-extrabold tablet:hidden"
          >
            <LogoMark className="size-[30px]" />
            keepmint
          </Link>
          <div className="hidden flex-1 tablet:block" />
          <ThemeToggle />
          <Link href="/app/settings" aria-label="Settings and profile" className="tablet:hidden">
            <Avatar />
          </Link>
        </header>

        <main className="flex-1 px-4 py-6 pb-28 tablet:px-8 tablet:py-8 tablet:pb-8">
          {children}
        </main>

        {/* Phone bottom tabs */}
        <nav
          aria-label="Main"
          className="fixed inset-x-0 bottom-0 z-10 flex items-end justify-around border-t-2 border-border bg-surface px-1.5 pt-1.5 pb-3.5 tablet:hidden"
        >
          {NAV.slice(0, 2).map((item) => (
            <TabLink key={item.href} {...item} active={isActive(item.href)} />
          ))}
          <Button
            size="icon"
            aria-label="Add link"
            className="-mt-[26px] size-14 rounded-[18px]"
            onClick={openAddLink}
          >
            <PlusIcon className="!size-6" aria-hidden strokeWidth={2.8} />
          </Button>
          {NAV.slice(2).map((item) => (
            <TabLink key={item.href} {...item} active={isActive(item.href)} />
          ))}
        </nav>
      </div>
    </div>
  )
}

function TabLink({ short, href, icon: Icon, active }: (typeof NAV)[number] & { active: boolean }) {
  return (
    <Link
      href={href}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'flex flex-1 flex-col items-center gap-0.5 text-[11px] font-bold',
        active ? 'text-ink' : 'text-muted',
      )}
    >
      <span
        className={cn(
          'flex h-[30px] w-10 items-center justify-center rounded-[10px]',
          active && 'bg-surface-2',
        )}
      >
        <Icon className="size-5" aria-hidden strokeWidth={2.3} />
      </span>
      {short}
    </Link>
  )
}

function Avatar() {
  return (
    <span
      aria-hidden
      className="flex size-9 items-center justify-center rounded-full border-2 border-border bg-pink font-bold text-sticker-ink"
    >
      S
    </span>
  )
}
