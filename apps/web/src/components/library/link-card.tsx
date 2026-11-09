'use client'

import type { SyncLink } from '@keepmint/core'
import { CheckIcon, FileCheckIcon, TriangleAlertIcon } from 'lucide-react'
import { useNow } from '@/lib/use-now'
import { cn } from '@/lib/utils'
import { isReading, LINK_TYPE_DISPLAY, linkTitle, needsRetry, timeAgo } from './link-display'

type ItemProps = {
  link: SyncLink
  collectionName: string
  selectMode: boolean
  selected: boolean
  onOpen: () => void
}

function SelectBox({ selected, className }: { selected: boolean; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        'flex size-6.5 shrink-0 items-center justify-center rounded-lg border-2 border-sticker-ink',
        selected ? 'bg-primary text-white' : 'bg-white',
        className,
      )}
    >
      {selected && <CheckIcon className="size-3.5" strokeWidth={3.5} />}
    </span>
  )
}

function itemLabel(link: SyncLink, selectMode: boolean, selected: boolean) {
  const title = linkTitle(link)
  if (selectMode) return `${selected ? 'Deselect' : 'Select'} ${title}`
  return `Open details for ${title}`
}

/** Grid card: coloured thumb with type icon, collection pill, title, two-line summary. */
export function LinkCard({ link, collectionName, selectMode, selected, onOpen }: ItemProps) {
  const now = useNow()
  const display = LINK_TYPE_DISPLAY[link.type]
  const reading = isReading(link, now)
  const failed = needsRetry(link, now)
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-pressed={selectMode ? selected : undefined}
      aria-label={itemLabel(link, selectMode, selected)}
      className={cn(
        'lift flex flex-col overflow-hidden rounded-[18px] border-2 border-border bg-card text-left',
        selected && 'outline-3 outline-offset-2 outline-primary',
      )}
    >
      <span
        className={cn(
          'relative flex h-27.5 w-full items-center justify-center border-b-2 border-border text-sticker-ink',
          reading ? 'bg-muted text-foreground' : failed ? 'bg-fail-soft text-err-ink' : display.bg,
        )}
      >
        {reading ? (
          <span className="animate-pulse text-sm font-bold">Reading the page…</span>
        ) : failed ? (
          <span className="flex items-center gap-1.5 text-sm font-bold">
            <TriangleAlertIcon aria-hidden className="size-4" strokeWidth={2.4} />
            Couldn’t read
          </span>
        ) : (
          <display.icon aria-hidden className="size-9" strokeWidth={1.8} />
        )}
        <span className="absolute top-2.5 left-2.5 rounded-full border-2 border-sticker-ink bg-white px-2 py-0.5 text-xs font-bold text-sticker-ink">
          {collectionName}
        </span>
        {selectMode ? (
          <SelectBox selected={selected} className="absolute top-2.5 right-2.5" />
        ) : (
          link.hasPageCopy && (
            <span
              title="Page copy saved"
              className="absolute top-2.5 right-2.5 flex size-7 items-center justify-center rounded-full border-2 border-sticker-ink bg-white text-sticker-ink"
            >
              <FileCheckIcon aria-hidden className="size-3.5" strokeWidth={2.4} />
              <span className="sr-only">Page copy saved</span>
            </span>
          )
        )}
      </span>
      <span className="flex w-full flex-col gap-1.5 px-4 pt-3.5 pb-4">
        <span className="flex items-start gap-2">
          {link.readState === 'unread' && (
            <span aria-hidden className="mt-1.75 size-2 shrink-0 rounded-full bg-primary" />
          )}
          <strong className="text-base leading-snug">{linkTitle(link)}</strong>
        </span>
        {(link.summary || failed) && (
          <span className="line-clamp-2 text-sm text-muted-foreground">
            {link.summary ?? link.failReason ?? 'This is taking too long. Open it to retry.'}
          </span>
        )}
        <span className="mt-1 flex justify-between gap-2 text-xs text-muted-foreground">
          <span className="truncate">
            {link.site} · {display.label}
          </span>
          <span className="shrink-0">{timeAgo(link.savedAt, now)}</span>
        </span>
      </span>
    </button>
  )
}

/** List row: thumb, title, site · type · time, collection pill. */
export function LinkRow({
  link,
  collectionName,
  selectMode,
  selected,
  onOpen,
  showCollection = true,
}: ItemProps & { showCollection?: boolean }) {
  const now = useNow()
  const display = LINK_TYPE_DISPLAY[link.type]
  const reading = isReading(link, now)
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-pressed={selectMode ? selected : undefined}
      aria-label={itemLabel(link, selectMode, selected)}
      className={cn(
        'flex w-full items-center gap-3 border-t-2 border-line px-3.5 py-3 text-left first:border-t-0 hover:bg-muted',
        selected && 'bg-muted',
      )}
    >
      {selectMode && <SelectBox selected={selected} />}
      <span
        aria-hidden
        className={cn(
          'flex size-11 shrink-0 items-center justify-center rounded-[10px] border-2 border-border text-sticker-ink',
          reading ? 'animate-pulse bg-muted' : display.bg,
        )}
      >
        <display.icon className="size-5" strokeWidth={2} />
      </span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="flex min-w-0 items-center gap-2">
          {link.readState === 'unread' && (
            <span aria-hidden className="size-2 shrink-0 rounded-full bg-primary" />
          )}
          <strong className="truncate">{reading ? 'Reading the page…' : linkTitle(link)}</strong>
        </span>
        <span className="truncate text-[13px] text-muted-foreground">
          {link.site} · {display.label} · {timeAgo(link.savedAt, now)}
        </span>
      </span>
      {showCollection && (
        <span className="hidden shrink-0 rounded-full border-2 border-border px-2 py-0.5 text-xs font-bold tablet:inline">
          {collectionName}
        </span>
      )}
      {link.hasPageCopy && (
        <span title="Page copy saved" className="shrink-0 text-muted-foreground">
          <FileCheckIcon aria-hidden className="size-4.5" strokeWidth={2.2} />
          <span className="sr-only">Page copy saved</span>
        </span>
      )}
    </button>
  )
}
