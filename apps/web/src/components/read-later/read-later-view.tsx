'use client'

import type { SyncLink } from '@keepmint/core'
import {
  ArrowUpToLineIcon,
  BookmarkIcon,
  BookOpenIcon,
  CheckIcon,
  FileCheckIcon,
} from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'
import { useAddLink } from '@/components/library/add-link'
import { EmptyState } from '@/components/library/empty-state'
import { useLibraryActions } from '@/components/library/library-actions'
import { LINK_TYPE_DISPLAY, lengthText, linkTitle } from '@/components/library/link-display'
import { useLibrary } from '@/components/library/use-library'
import { Button, buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type Tab = 'queue' | 'progress' | 'done'
type Length = 'any' | 'short' | 'medium' | 'long'

const TABS: { key: Tab; label: string }[] = [
  { key: 'queue', label: 'Queue' },
  { key: 'progress', label: 'In progress' },
  { key: 'done', label: 'Finished' },
]

/** "Got time for…": by the estimated read / watch time. */
const LENGTHS: { key: Length; label: string; test: (m: number | null) => boolean }[] = [
  { key: 'any', label: 'Any length', test: () => true },
  { key: 'short', label: '5 min or less', test: (m) => m !== null && m <= 5 },
  { key: 'medium', label: '5–15 min', test: (m) => m !== null && m > 5 && m <= 15 },
  { key: 'long', label: '15 min +', test: (m) => m !== null && m > 15 },
]

const inTab = (l: SyncLink, tab: Tab) =>
  l.readLater &&
  (tab === 'queue'
    ? l.readState === 'unread'
    : tab === 'progress'
      ? l.readState === 'in_progress'
      : l.readState === 'done')

/** Queue order: rank ascending (Move to top makes it smallest); Finished: newest first. */
function order(tab: Tab) {
  return (a: SyncLink, b: SyncLink) =>
    tab === 'done'
      ? (b.finishedAt ?? '').localeCompare(a.finishedAt ?? '')
      : (a.readLaterRank ?? Number.MAX_SAFE_INTEGER) - (b.readLaterRank ?? Number.MAX_SAFE_INTEGER)
}

export function ReadLaterView() {
  const { links, collections, loaded } = useLibrary()
  const actions = useLibraryActions()
  const { open: openAddLink } = useAddLink()
  // null until the user picks: then open on In progress if that's where the reading is.
  const [chosenTab, setTab] = useState<Tab | null>(null)
  const [length, setLength] = useState<Length>('any')
  const [copyOnly, setCopyOnly] = useState(false)

  const all = Object.values(links)
  const counts = Object.fromEntries(
    TABS.map((t) => [t.key, all.filter((l) => inTab(l, t.key)).length]),
  ) as Record<Tab, number>
  const tab: Tab = chosenTab ?? (counts.queue || !counts.progress ? 'queue' : 'progress')
  const tabLinks = all.filter((l) => inTab(l, tab) && (!copyOnly || l.hasPageCopy)).sort(order(tab))
  const lengthTest = LENGTHS.find((x) => x.key === length)?.test ?? (() => true)
  const rows = tabLinks.filter((l) => lengthTest(l.readMinutes))
  const upNext = tab !== 'done' ? rows[0] : undefined
  const rest = upNext ? rows.slice(1) : rows
  const queued = counts.queue + counts.progress
  const minutes = all
    .filter((l) => l.readLater && l.readState !== 'done')
    .reduce((sum, l) => sum + (l.readMinutes ?? 0), 0)
  const collectionName = (l: SyncLink) =>
    l.collectionId ? (collections[l.collectionId]?.name ?? 'Unsorted') : 'Unsorted'
  const meta = (l: SyncLink) =>
    [l.site, lengthText(l), collectionName(l)].filter(Boolean).join(' · ')

  if (!loaded) return <div className="h-64 animate-pulse rounded-[20px] bg-muted" />

  return (
    <div className="mx-auto flex max-w-290 flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3.5">
        <div className="flex flex-col gap-1">
          <h1 className="font-display text-[clamp(26px,4vw,34px)] leading-tight font-extrabold tracking-tight">
            Read later
          </h1>
          <p className="text-muted-foreground">
            {queued
              ? `${queued} to read${minutes ? ` · about ${minutes} min` : ''}`
              : 'Your reading queue'}
          </p>
        </div>
        <div
          role="tablist"
          aria-label="Read later"
          className="flex max-w-full gap-1 overflow-x-auto rounded-xl border-2 border-border bg-card p-0.75"
        >
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              role="tab"
              aria-selected={tab === t.key}
              onClick={() => setTab(t.key)}
              className={cn(
                'h-9 shrink-0 rounded-[9px] px-3 text-sm font-bold whitespace-nowrap',
                tab === t.key ? 'bg-foreground text-background' : 'hover:bg-muted',
              )}
            >
              {t.label} <span className="opacity-75">{counts[t.key]}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span id="len-l" className="mr-0.5 text-sm font-bold text-muted-foreground">
          Got time for
        </span>
        <fieldset aria-labelledby="len-l" className="flex min-w-0 flex-wrap gap-2">
          {LENGTHS.map((x) => (
            <button
              key={x.key}
              type="button"
              aria-pressed={length === x.key}
              onClick={() => setLength(x.key)}
              className={cn(
                'flex h-9.5 items-center gap-2 rounded-full border-2 border-border pr-2.5 pl-3.5 text-sm font-bold',
                length === x.key ? 'bg-foreground text-background' : 'bg-card hover:bg-muted',
              )}
            >
              {x.label}
              <span
                className={cn(
                  'min-w-5.5 rounded-full px-1.5 text-center text-xs',
                  length === x.key ? 'bg-background/20' : 'bg-muted',
                )}
              >
                {tabLinks.filter((l) => x.test(l.readMinutes)).length}
              </span>
            </button>
          ))}
        </fieldset>
        <span className="flex-1" />
        <button
          type="button"
          aria-pressed={copyOnly}
          onClick={() => setCopyOnly((v) => !v)}
          className={cn(
            'flex h-9.5 items-center gap-1.5 rounded-xl border-2 border-border px-3 text-sm font-bold',
            copyOnly ? 'bg-foreground text-background' : 'bg-card hover:bg-muted',
          )}
        >
          <FileCheckIcon aria-hidden className="size-4" strokeWidth={2.4} />
          Page saved
        </button>
      </div>

      {upNext && (
        <section
          aria-labelledby="upnext-h"
          className="flex flex-wrap overflow-hidden rounded-[22px] border-2 border-border bg-card"
        >
          <div
            className={cn(
              'relative flex min-h-42.5 flex-[1_1_220px] items-center justify-center border-b-2 border-border text-sticker-ink tablet:border-r-2 tablet:border-b-0',
              LINK_TYPE_DISPLAY[upNext.type].bg,
            )}
          >
            {(() => {
              const Icon = LINK_TYPE_DISPLAY[upNext.type].icon
              return <Icon aria-hidden className="size-14" strokeWidth={1.6} />
            })()}
            <span
              id="upnext-h"
              className="absolute top-3 left-3 rounded-full border-2 border-sticker-ink bg-sticker-ink px-2.5 py-0.5 text-xs font-bold text-white"
            >
              Up next
            </span>
          </div>
          <div className="flex flex-[2_1_340px] flex-col gap-2.5 p-5 tablet:p-6">
            <span className="text-[13px] font-semibold text-muted-foreground">{meta(upNext)}</span>
            <strong className="font-display text-xl leading-tight tracking-tight">
              {linkTitle(upNext)}
            </strong>
            {upNext.summary && <span className="text-muted-foreground">{upNext.summary}</span>}
            {upNext.readProgress > 0 && (
              <div className="flex items-center gap-2.5">
                <div
                  aria-hidden
                  className="h-2.5 max-w-65 flex-1 overflow-hidden rounded-full border-[1.5px] border-border"
                >
                  <div className="h-full bg-primary" style={{ width: `${upNext.readProgress}%` }} />
                </div>
                <span className="text-[13px] font-bold">{upNext.readProgress}% read</span>
              </div>
            )}
            <div className="mt-1 flex flex-wrap gap-2.5">
              <Link href={`/app/read/${upNext.id}`} className={buttonVariants({ size: 'lg' })}>
                <BookOpenIcon aria-hidden />
                {upNext.readProgress > 0 ? 'Continue' : 'Read now'}
              </Link>
              <Button
                variant="outline"
                size="lg"
                onClick={() => void actions.setDone([upNext.id], true)}
              >
                Mark as done
              </Button>
            </div>
          </div>
        </section>
      )}

      {rest.length > 0 && (
        <section aria-labelledby="queue-h" className="flex flex-col gap-2.5">
          <div className="flex items-baseline justify-between gap-2.5">
            <h2 id="queue-h" className="font-display text-lg font-bold tracking-tight">
              {tab === 'done' ? 'Finished' : 'After that'}
            </h2>
            <span className="text-[13px] text-muted-foreground">
              {tab === 'done' ? 'Most recent first' : 'Move to top to read it next'}
            </span>
          </div>
          <ol className="overflow-hidden rounded-[18px] border-2 border-border bg-card">
            {rest.map((l, i) => (
              <li
                key={l.id}
                className="flex items-center gap-2.5 border-t-2 border-line py-2.5 pr-3 pl-2.5 first:border-t-0"
              >
                {tab !== 'done' && (
                  <span
                    aria-hidden
                    className="w-5.5 shrink-0 text-center text-[13px] font-bold text-muted-foreground"
                  >
                    {i + 2}
                  </span>
                )}
                <Link
                  href={`/app/read/${l.id}`}
                  className="flex min-w-0 flex-1 items-center gap-3 rounded-[10px] p-1 hover:bg-muted"
                >
                  <span
                    aria-hidden
                    className={cn(
                      'flex size-11 shrink-0 items-center justify-center rounded-[10px] border-2 border-border text-sticker-ink',
                      LINK_TYPE_DISPLAY[l.type].bg,
                    )}
                  >
                    {(() => {
                      const Icon = LINK_TYPE_DISPLAY[l.type].icon
                      return <Icon className="size-5" strokeWidth={2} />
                    })()}
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col gap-0.75">
                    <strong className={cn('truncate', tab === 'done' && 'text-muted-foreground')}>
                      {linkTitle(l)}
                    </strong>
                    <span className="truncate text-[13px] text-muted-foreground">{meta(l)}</span>
                    {l.readProgress > 0 && tab !== 'done' && (
                      <span
                        aria-hidden
                        className="block h-1.5 w-full max-w-50 overflow-hidden rounded-full bg-muted"
                      >
                        <span
                          className="block h-full bg-primary"
                          style={{ width: `${l.readProgress}%` }}
                        />
                      </span>
                    )}
                  </span>
                </Link>
                {tab === 'queue' && (
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Move ${linkTitle(l)} to the top`}
                    title="Move to top"
                    onClick={() => void actions.moveToTop(l.id)}
                  >
                    <ArrowUpToLineIcon aria-hidden />
                  </Button>
                )}
                <button
                  type="button"
                  aria-pressed={tab === 'done'}
                  aria-label={
                    tab === 'done'
                      ? `Move ${linkTitle(l)} back to the queue`
                      : `Mark ${linkTitle(l)} as done`
                  }
                  title={tab === 'done' ? 'Back to the queue' : 'Mark as done'}
                  onClick={() => void actions.setDone([l.id], tab !== 'done')}
                  className={cn(
                    'flex size-9.5 shrink-0 items-center justify-center rounded-full border-2 border-border',
                    tab === 'done'
                      ? 'bg-mint text-sticker-ink'
                      : 'bg-card text-muted-foreground hover:bg-mint hover:text-sticker-ink',
                  )}
                >
                  <CheckIcon aria-hidden className="size-4" strokeWidth={3} />
                </button>
              </li>
            ))}
          </ol>
        </section>
      )}

      {rows.length === 0 &&
        (tab === 'done' ? (
          <EmptyState
            icon={CheckIcon}
            colors={['bg-mint', 'bg-yellow']}
            title="Nothing finished yet"
          >
            Links you mark as done land here, so you can find them again.
          </EmptyState>
        ) : tabLinks.length > 0 ? (
          <EmptyState
            icon={BookmarkIcon}
            colors={['bg-sky', 'bg-pink']}
            title="Nothing that length"
          >
            No links here fit that time. Try another length.
          </EmptyState>
        ) : (
          <EmptyState
            icon={BookmarkIcon}
            colors={['bg-pink', 'bg-sky']}
            title={tab === 'progress' ? 'Nothing in progress' : 'Nothing queued to read'}
            actions={tab === 'queue' && <Button onClick={() => openAddLink()}>Save a link</Button>}
          >
            Tap “Add to Read later” on any link, or tick it when you save. Keepmint keeps a clean
            copy of articles to read here.
          </EmptyState>
        ))}
    </div>
  )
}
