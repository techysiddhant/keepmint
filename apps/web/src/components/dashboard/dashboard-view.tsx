'use client'

import { localDay, type SyncLink } from '@keepmint/core'
import { ClockIcon, RotateCwIcon, SparklesIcon, TriangleAlertIcon } from 'lucide-react'
import Link from 'next/link'
import { useMemo, useState } from 'react'
import { useLibrary } from '@/components/library/library-provider'
import { timeAgo } from '@/components/library/link-display'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { FirstRun } from './first-run'
import {
  firstName,
  greeting,
  isBusy,
  LinkThumb,
  needsRetry,
  STUCK_REASON,
  UsageBar,
} from './shared'

const DAY = 86_400_000

export function DashboardView({ name, timezone }: { name: string; timezone: string }) {
  const library = useLibrary()
  const links = useMemo(
    () => Object.values(library.links).sort((a, b) => b.savedAt.localeCompare(a.savedAt)),
    [library.links],
  )
  // Once a link is saved from the welcome screen, stay there for the rest of the visit,
  // including after "Save another" / "Try another link" clear the link id.
  const [welcomeSession, setWelcomeSession] = useState(false)
  const [welcomeLinkId, setWelcomeLinkId] = useState<string | null>(null)
  const onWelcomeLinkId = (id: string | null) => {
    if (id) setWelcomeSession(true)
    setWelcomeLinkId(id)
  }

  if (!library.loaded) return <DashboardSkeleton />
  // A failed load shows an empty library; don't mistake that for a new user.
  if (library.loadError && links.length === 0) {
    return <LoadError onRetry={() => void library.refresh()} />
  }
  if (links.length === 0 || welcomeSession) {
    return <FirstRun name={firstName(name)} linkId={welcomeLinkId} onLinkId={onWelcomeLinkId} />
  }
  return <Dashboard name={firstName(name)} timezone={timezone} links={links} />
}

function Dashboard({
  name,
  timezone,
  links,
}: {
  name: string
  timezone: string
  links: SyncLink[]
}) {
  const { usage, collections, retryLink } = useLibrary()
  const now = Date.now()
  const age = (l: SyncLink) => now - new Date(l.savedAt).getTime()
  const thisWeek = links.filter((l) => age(l) < 7 * DAY).length
  const lastWeek = links.filter((l) => age(l) >= 7 * DAY && age(l) < 14 * DAY).length
  // Saves per calendar day in the user's time zone, oldest first, today last.
  const perDay = new Map<string, number>()
  for (const l of links) {
    const day = localDay(timezone, new Date(l.savedAt))
    perDay.set(day, (perDay.get(day) ?? 0) + 1)
  }
  const spark = Array.from(
    { length: 7 },
    (_, i) => perDay.get(localDay(timezone, new Date(now - (6 - i) * DAY))) ?? 0,
  )
  const sparkMax = Math.max(1, ...spark)
  const readLater = links.filter((l) => l.readLater).length
  const waiting = links.filter(isBusy)
  const failed = links.filter(needsRetry)
  const review = links.filter((l) => l.status === 'needs_review').length
  const collectionCount = Object.keys(collections).length
  const diff = thisWeek - lastWeek

  return (
    <div className="mx-auto flex max-w-[1160px] flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="font-display text-[clamp(26px,4vw,34px)] leading-tight font-extrabold tracking-tight">
          {greeting(timezone)}
          {name ? `, ${name}` : ''}
        </h1>
        <p className="text-muted-foreground">
          Here’s your library at a glance
          {review > 0 && (
            <>
              {' · '}
              <strong className="text-foreground">
                {review} {review === 1 ? 'link needs' : 'links need'} a quick check
              </strong>
            </>
          )}
        </p>
      </div>

      <section aria-label="Key numbers" className="grid grid-cols-2 gap-4 desktop:grid-cols-4">
        <Stat label="Saved this week" value={thisWeek}>
          <span className="text-[13px] font-semibold text-muted-foreground">
            <span className={cn('font-bold', diff >= 0 ? 'text-up-ink' : 'text-err-ink')}>
              {diff >= 0 ? '▲' : '▼'} {Math.abs(diff)}
            </span>{' '}
            vs last week
          </span>
          <div
            role="img"
            aria-label={`Saves per day, last 7 days: ${spark.join(', ')}`}
            className="absolute top-[18px] right-[18px] flex h-[30px] items-end gap-[3px]"
          >
            {spark.map((n, i) => (
              <span
                // biome-ignore lint/suspicious/noArrayIndexKey: fixed 7-day series
                key={i}
                className={cn('w-1.5 rounded-t-[3px]', i === 6 ? 'bg-primary' : 'bg-lilac')}
                style={{ height: `${Math.max(3, (n / sparkMax) * 30)}px` }}
              />
            ))}
          </div>
        </Stat>
        <Stat label="In your library" value={links.length}>
          <span className="text-[13px] font-semibold text-muted-foreground">
            {collectionCount} {collectionCount === 1 ? 'collection' : 'collections'} · {readLater}{' '}
            to read later
          </span>
        </Stat>
        <Stat
          label="Being read"
          value={waiting.length}
          icon={<ClockIcon aria-hidden className="size-[15px]" strokeWidth={2.4} />}
          className={waiting.length ? 'bg-yellow text-sticker-ink' : undefined}
        >
          <span className="text-[13px] font-semibold">
            {waiting.length ? 'Summaries take a few seconds' : 'Nothing waiting'}
          </span>
        </Stat>
        <Stat
          label="Couldn’t read"
          value={failed.length}
          icon={<TriangleAlertIcon aria-hidden className="size-[15px]" strokeWidth={2.4} />}
          className={failed.length ? 'bg-fail-soft text-err-ink' : undefined}
        >
          <span className="text-[13px] font-semibold">
            {failed.length ? 'Retry them below' : 'All good'}
          </span>
        </Stat>
      </section>

      {usage && (
        <div className="flex flex-wrap items-center gap-x-[18px] gap-y-2.5 rounded-[18px] border-2 border-border bg-card px-[18px] py-3.5">
          <span className="flex items-center gap-2 text-sm font-bold">
            <SparklesIcon aria-hidden className="size-4" strokeWidth={2.2} />
            AI sorts today
          </span>
          <span className="font-display text-lg font-extrabold">
            {usage.used} <span className="font-sans text-sm font-semibold">/ {usage.limit}</span>
          </span>
          <UsageBar usage={usage} className="min-w-[180px] flex-1" />
          <span className="text-[13px] font-semibold text-muted-foreground">
            {!usage.enabled
              ? 'AI sorting is off'
              : usage.used >= usage.limit
                ? 'Paused until midnight · links still save'
                : `${usage.limit - usage.used} left · resets at midnight`}
          </span>
        </div>
      )}

      <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-6 desktop:grid-cols-[minmax(0,1fr)_minmax(0,1.35fr)]">
        <section
          aria-labelledby="progress-h"
          className="flex flex-col gap-3.5 rounded-[20px] border-2 border-border bg-card p-5"
        >
          <h2 id="progress-h" className="font-display text-[17px] font-bold tracking-tight">
            In progress
          </h2>
          {failed.length > 0 && (
            <div className="flex flex-col gap-2">
              <span className="text-xs font-bold tracking-wider text-err-ink">
                COULDN’T READ · {failed.length}
              </span>
              {failed.slice(0, 5).map((l) => (
                <div
                  key={l.id}
                  className="flex flex-col gap-2 rounded-[14px] border-2 border-border bg-fail-soft p-3"
                >
                  <div className="flex min-w-0 flex-col">
                    <strong className="truncate">{l.title ?? l.url}</strong>
                    <span className="text-[13px] text-muted-foreground">
                      {l.failReason ?? STUCK_REASON}
                    </span>
                  </div>
                  <Button size="sm" className="self-start" onClick={() => void retryLink(l.id)}>
                    <RotateCwIcon aria-hidden />
                    Retry
                  </Button>
                </div>
              ))}
            </div>
          )}
          {waiting.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-bold tracking-wider text-muted-foreground">
                READING · {waiting.length}
              </span>
              {waiting.map((l) => (
                <div
                  key={l.id}
                  className="flex items-center gap-2.5 rounded-xl border-2 border-dashed border-line px-2.5 py-2"
                >
                  <LinkThumb link={l} className="size-6 rounded-lg" />
                  <span className="min-w-0 flex-1 truncate font-semibold">{l.title ?? l.url}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {timeAgo(l.savedAt)}
                  </span>
                </div>
              ))}
            </div>
          )}
          {failed.length === 0 && waiting.length === 0 && (
            <p
              role="status"
              className="rounded-[14px] border-2 border-border bg-mint p-4 text-sticker-ink"
            >
              <strong>All caught up.</strong> Every link is read and filed.
            </p>
          )}
        </section>

        <section
          aria-labelledby="activity-h"
          className="flex flex-col gap-1.5 rounded-[20px] border-2 border-border bg-card p-5"
        >
          <div className="mb-1.5 flex items-baseline justify-between gap-2.5">
            <h2 id="activity-h" className="font-display text-[17px] font-bold tracking-tight">
              Recent activity
            </h2>
            <Link
              href="/app/links"
              className="text-sm font-bold underline decoration-2 underline-offset-[3px]"
            >
              See all
            </Link>
          </div>
          <ul className="flex flex-col">
            {links.slice(0, 8).map((l) => (
              <ActivityRow
                key={l.id}
                link={l}
                collection={l.collectionId ? collections[l.collectionId]?.name : undefined}
              />
            ))}
          </ul>
        </section>
      </div>
    </div>
  )
}

function ActivityRow({ link, collection }: { link: SyncLink; collection?: string }) {
  const title = link.title ?? link.site ?? link.url
  const [verb, detail] = isBusy(link)
    ? ['Reading', 'Summarising and filing…']
    : needsRetry(link)
      ? ['Couldn’t read', link.failReason ?? STUCK_REASON]
      : link.status === 'needs_review'
        ? ['Check', `AI suggests “${link.aiSuggestedCollection ?? 'Unsorted'}”`]
        : link.status === 'no_ai'
          ? ['Saved', 'Not summarised — AI sorting was off or used up']
          : [collection ? `Filed in ${collection}` : 'Saved', link.summary ?? '']
  return (
    <li className="flex items-center gap-3 rounded-xl px-2 py-2.5 hover:bg-muted">
      <LinkThumb link={link} />
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="truncate">
          <span className="text-muted-foreground">{verb}</span> <strong>{title}</strong>
        </span>
        <span className="truncate text-[13px] text-muted-foreground">{detail}</span>
      </div>
      <span className="shrink-0 text-xs text-muted-foreground">{timeAgo(link.savedAt)}</span>
    </li>
  )
}

function Stat({
  label,
  value,
  icon,
  className,
  children,
}: {
  label: string
  value: number
  icon?: React.ReactNode
  className?: string
  children?: React.ReactNode
}) {
  return (
    <div
      className={cn(
        'relative flex flex-col gap-1.5 rounded-[18px] border-2 border-border bg-card p-[18px]',
        className,
      )}
    >
      <span
        className={cn(
          'flex items-center gap-1.5 text-[13px] font-bold',
          !className && 'text-muted-foreground',
        )}
      >
        {icon}
        {label}
      </span>
      <span className="font-display text-[32px] leading-none font-extrabold">{value}</span>
      {children}
    </div>
  )
}

function LoadError({ onRetry }: { onRetry: () => void }) {
  return (
    <div
      role="alert"
      className="mx-auto flex max-w-[560px] flex-col items-start gap-3 rounded-[20px] border-2 border-border bg-fail-soft p-6 text-err-ink"
    >
      <h1 className="font-display text-xl font-bold">Couldn’t load your library</h1>
      <p>Check your connection and try again. Nothing you saved is lost.</p>
      <Button onClick={onRetry}>
        <RotateCwIcon aria-hidden />
        Try again
      </Button>
    </div>
  )
}

function DashboardSkeleton() {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label="Loading your library"
      className="mx-auto flex max-w-[1160px] flex-col gap-6"
    >
      <div className="h-9 w-72 animate-pulse rounded-xl bg-muted" />
      <div className="grid grid-cols-2 gap-4 desktop:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-[118px] animate-pulse rounded-[18px] bg-muted" />
        ))}
      </div>
      <div className="h-64 animate-pulse rounded-[20px] bg-muted" />
    </div>
  )
}
