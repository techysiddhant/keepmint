'use client'

import { useQueryClient } from '@tanstack/react-query'
import {
  BookmarkIcon,
  FolderIcon,
  HomeIcon,
  LibraryIcon,
  LogOutIcon,
  PlusIcon,
  SettingsIcon,
} from 'lucide-react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { type ReactNode, useEffect } from 'react'
import { useAddLink } from '@/components/library/add-link'
import { SearchBox } from '@/components/library/search-box'
import { LogoMark } from '@/components/logo'
import { ThemeToggle } from '@/components/theme-toggle'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { authClient } from '@/lib/auth-client'
import { cn } from '@/lib/utils'

export type ShellUser = { name: string; email: string; role: string; timezone: string }

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

/** Desktop sidebar (≥1101px), tablet icon rail (601–1100px), phone top bar + bottom tabs. */
export function AppShell({ user, children }: { user: ShellUser; children: ReactNode }) {
  const isActive = useIsActive()
  const router = useRouter()
  const { open: openAddLink } = useAddLink()
  const queryClient = useQueryClient()

  // Keep "today" (the daily AI limit) in the time zone the user is actually in.
  useEffect(() => {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
    if (tz && tz !== user.timezone) void authClient.updateUser({ timezone: tz })
  }, [user.timezone])

  async function logOut() {
    await authClient.signOut()
    // Drop every cached query (the library included) so nothing outlives the session.
    queryClient.clear()
    router.replace('/login')
    router.refresh()
  }

  return (
    <div className="flex min-h-dvh flex-col tablet:flex-row">
      {/* Desktop sidebar */}
      <aside
        aria-label="Main navigation"
        className="sticky top-0 hidden h-dvh w-62 shrink-0 flex-col gap-5 border-r-2 border-border bg-card px-4 py-5.5 desktop:flex"
      >
        <Link
          href="/app"
          className="flex items-center gap-2.5 px-1.5 font-display text-[21px] font-extrabold"
        >
          <LogoMark />
          keepmint
        </Link>
        <Button size="lg" className="justify-start" onClick={() => openAddLink()}>
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
                'flex items-center gap-3 rounded-xl border-2 border-transparent px-3 py-2.5 font-bold transition-colors hover:bg-muted',
                isActive(href) && 'border-foreground bg-muted',
              )}
            >
              <Icon className="size-4.5" aria-hidden strokeWidth={2.2} />
              {label}
            </Link>
          ))}
        </nav>
        <div className="mt-auto flex flex-col gap-1">
          <Link
            href="/app/settings"
            aria-current={isActive('/app/settings') ? 'page' : undefined}
            className={cn(
              'flex items-center gap-3 rounded-xl border-2 border-transparent px-3 py-2.5 font-bold hover:bg-muted',
              isActive('/app/settings') && 'border-foreground bg-muted',
            )}
          >
            <SettingsIcon className="size-4.5" aria-hidden strokeWidth={2.2} />
            Settings
          </Link>
          <div className="flex items-center gap-2.5 rounded-xl p-2">
            <Avatar name={user.name} />
            <span className="flex min-w-0 flex-1 flex-col leading-tight">
              <strong className="truncate">{user.name}</strong>
              <span className="text-[13px] text-muted-foreground">Beta</span>
            </span>
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button variant="ghost" size="icon" aria-label="Log out" onClick={logOut} />
                }
              >
                <LogOutIcon aria-hidden />
              </TooltipTrigger>
              <TooltipContent>Log out</TooltipContent>
            </Tooltip>
          </div>
        </div>
      </aside>

      {/* Tablet icon rail */}
      <aside
        aria-label="Main navigation"
        className="sticky top-0 hidden h-dvh w-20 shrink-0 flex-col items-center gap-3 border-r-2 border-border bg-card px-3 py-4.5 tablet:flex desktop:hidden"
      >
        <Link href="/app" aria-label="Keepmint home">
          <LogoMark className="size-10 rounded-[11px]" />
        </Link>
        <Button
          size="icon"
          className="my-1.5 size-12.5 rounded-[14px]"
          aria-label="Add link"
          onClick={() => openAddLink()}
        >
          <PlusIcon aria-hidden strokeWidth={2.8} />
        </Button>
        {[
          ...NAV,
          { label: 'Settings', short: 'Settings', href: '/app/settings', icon: SettingsIcon },
        ].map(({ label, href, icon: Icon }) => (
          <Tooltip key={href}>
            <TooltipTrigger
              render={
                <Link
                  href={href}
                  aria-label={label}
                  aria-current={isActive(href) ? 'page' : undefined}
                  className={cn(
                    'flex size-12 items-center justify-center rounded-xl border-2 border-transparent hover:bg-muted',
                    isActive(href) && 'border-foreground bg-muted',
                    href === '/app/settings' && 'mt-auto',
                  )}
                />
              }
            >
              <Icon className="size-5" aria-hidden strokeWidth={2.2} />
            </TooltipTrigger>
            <TooltipContent side="right">{label}</TooltipContent>
          </Tooltip>
        ))}
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top bar */}
        <header className="sticky top-0 z-10 flex flex-wrap items-center gap-2.5 border-b-2 border-border bg-card px-4 py-3 tablet:flex-nowrap tablet:px-6">
          <Link
            href="/app"
            className="flex flex-1 items-center gap-2 font-display text-[19px] font-extrabold tablet:hidden"
          >
            <LogoMark className="size-7.5" />
            keepmint
          </Link>
          <SearchBox className="order-last w-full tablet:order-none tablet:w-auto tablet:max-w-160 tablet:flex-1" />
          <div className="hidden flex-1 tablet:block" />
          <ThemeToggle />
          <Link href="/app/settings" aria-label="Settings and profile" className="tablet:hidden">
            <Avatar name={user.name} />
          </Link>
        </header>

        <main className="flex-1 px-4 py-6 pb-28 tablet:px-8 tablet:py-8 tablet:pb-8">
          {children}
        </main>

        {/* Phone bottom tabs */}
        <nav
          aria-label="Main"
          className="fixed inset-x-0 bottom-0 z-10 flex items-end justify-around border-t-2 border-border bg-card px-1.5 pt-1.5 pb-3.5 tablet:hidden"
        >
          {NAV.slice(0, 2).map((item) => (
            <TabLink key={item.href} {...item} active={isActive(item.href)} />
          ))}
          <Button
            size="icon"
            aria-label="Add link"
            className="-mt-6.5 size-14 rounded-[18px]"
            onClick={() => openAddLink()}
          >
            <PlusIcon className="size-6!" aria-hidden strokeWidth={2.8} />
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
        active ? 'text-foreground' : 'text-muted-foreground',
      )}
    >
      <span
        className={cn(
          'flex h-7.5 w-10 items-center justify-center rounded-[10px]',
          active && 'bg-muted',
        )}
      >
        <Icon className="size-5" aria-hidden strokeWidth={2.3} />
      </span>
      {short}
    </Link>
  )
}

function Avatar({ name }: { name: string }) {
  return (
    <span
      aria-hidden
      className="flex size-9 shrink-0 items-center justify-center rounded-full border-2 border-border bg-pink font-bold text-sticker-ink"
    >
      {name.trim().charAt(0).toUpperCase() || '?'}
    </span>
  )
}
