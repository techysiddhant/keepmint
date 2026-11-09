'use client'

import { useQuery } from '@tanstack/react-query'
import { ArrowLeftIcon, ExternalLinkIcon, PlayIcon } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect, useEffectEvent, useRef, useState } from 'react'
import { useLibraryActions } from '@/components/library/library-actions'
import { LINK_TYPE_DISPLAY, lengthText, linkTitle } from '@/components/library/link-display'
import { safeHref } from '@/components/library/link-drawer'
import { useLibrary } from '@/components/library/use-library'
import { Button, buttonVariants } from '@/components/ui/button'
import { getPageContent, pushChangesBeforeUnload } from '@/lib/api'
import { useStoredValue } from '@/lib/use-stored-value'
import { cn } from '@/lib/utils'

const SIZES = [15, 17, 19, 21, 23] as const
const SIZE_KEY = 'keepmint.readerSize'
const DEFAULT_SIZE = 1
/** Save progress when it moves by this many percent (and when leaving). */
const PROGRESS_STEP = 10

export function Reader({ id }: { id: string }) {
  const router = useRouter()
  const { links, collections, loaded } = useLibrary()
  const actions = useLibraryActions()
  const link = links[id]
  const scroller = useRef<HTMLDivElement>(null)
  const [savedSize, setSavedSize] = useStoredValue(SIZE_KEY)
  const size = savedSize !== null && Number(savedSize) in SIZES ? Number(savedSize) : DEFAULT_SIZE
  const [progress, setProgress] = useState(0)
  const saved = useRef<number | null>(null)
  const restored = useRef(false)

  const content = useQuery({
    queryKey: ['page-content', id],
    queryFn: () => getPageContent(id),
    enabled: Boolean(link?.hasPageCopy),
    // A copy never changes; "not available" may be a passing failure, so ask again next time.
    staleTime: (query) => (query.state.data?.paragraphs ? Number.POSITIVE_INFINITY : 0),
  })

  const changeSize = (i: number) => setSavedSize(String(i))

  // Always to the queue, as the button says, even if the reader was opened from elsewhere.
  const close = () => router.push('/app/read-later')

  const closeOnEscape = useEffectEvent((e: KeyboardEvent) => {
    if (e.key === 'Escape') close()
  })
  useEffect(() => {
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [])

  // Pick up where the reader left off, once the text is in place. A failed load waits for its
  // retry, and until then nothing here can overwrite the saved position.
  const ready = Boolean(link) && (!link?.hasPageCopy || content.isSuccess)
  useEffect(() => {
    if (!ready || restored.current || !link || !scroller.current) return
    restored.current = true
    saved.current = link.readProgress
    const el = scroller.current
    if (link.readProgress > 0 && link.readProgress < 100) {
      el.scrollTop = ((el.scrollHeight - el.clientHeight) * link.readProgress) / 100
    }
    setProgress(link.readProgress)
  }, [ready, link])

  /** The change to send for this position, or null when there's nothing new to save. */
  const takeProgressPatch = (pct: number) => {
    if (!link || saved.current === null || pct === saved.current) return null
    if (link.readState === 'done') return null
    saved.current = pct
    return {
      readProgress: pct,
      ...(link.readState === 'unread' ? { readState: 'in_progress' as const } : {}),
    }
  }

  const saveProgress = (pct: number) => {
    const patch = takeProgressPatch(pct)
    if (patch) {
      void actions.updateLinks([id], patch, 'Couldn’t save your reading progress.')
    }
  }

  const onScroll = () => {
    const el = scroller.current
    if (!el) return
    const max = el.scrollHeight - el.clientHeight
    const pct = max > 0 ? Math.min(100, Math.round((el.scrollTop / max) * 100)) : 100
    setProgress(pct)
    if (saved.current !== null && Math.abs(pct - saved.current) >= PROGRESS_STEP) saveProgress(pct)
  }

  // Save the last position when leaving the reader.
  const saveOnLeave = useEffectEvent(() => saveProgress(progress))
  useEffect(() => () => saveOnLeave(), [])

  // Closing or reloading the tab never runs React's cleanup, and on phones switching apps may
  // be the last thing that happens, so also save whenever the page is hidden.
  const saveOnHide = useEffectEvent(() => {
    if (document.visibilityState !== 'hidden') return
    const patch = takeProgressPatch(progress)
    if (patch) pushChangesBeforeUnload([{ kind: 'link.update', id, patch }])
  })
  useEffect(() => {
    document.addEventListener('visibilitychange', saveOnHide)
    return () => document.removeEventListener('visibilitychange', saveOnHide)
  }, [])

  const markDone = async () => {
    if (link && (await actions.setDone([link.id], true))) close()
  }

  if (!loaded) return <div className="fixed inset-0 z-50 animate-pulse bg-background" />
  if (!link) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-3 bg-background p-6 text-center">
        <strong className="font-display text-xl">This link is gone</strong>
        <Button onClick={() => router.push('/app/read-later')}>Back to Read later</Button>
      </div>
    )
  }

  const display = LINK_TYPE_DISPLAY[link.type]
  const href = safeHref(link.url)
  const collection = link.collectionId ? collections[link.collectionId]?.name : 'Unsorted'
  const paragraphs = content.data?.paragraphs ?? null
  const minutesLeft = link.readMinutes
    ? Math.max(1, Math.round((link.readMinutes * (100 - progress)) / 100))
    : null

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="rd-h"
      className="fixed inset-0 z-50 flex flex-col bg-background"
    >
      <div className="flex items-center gap-2.5 border-b-2 border-border bg-card px-3.5 py-2.5">
        <Button variant="ghost" onClick={close} className="pl-1.5">
          <ArrowLeftIcon aria-hidden />
          Read later
        </Button>
        <span className="min-w-0 flex-1 truncate text-sm font-semibold text-muted-foreground">
          {link.site}
        </span>
        {link.hasPageCopy && (
          <span className="hidden shrink-0 rounded-full border-2 border-border bg-mint px-2.5 py-0.5 text-xs font-bold text-sticker-ink tablet:inline">
            ✓ Page saved
          </span>
        )}
        <fieldset
          aria-label="Text size"
          className="flex shrink-0 gap-0.75 rounded-[10px] border-2 border-border p-0.75"
        >
          <button
            type="button"
            aria-label="Smaller text"
            disabled={size === 0}
            onClick={() => changeSize(size - 1)}
            className="h-7.5 w-8.5 rounded-[7px] text-[13px] font-bold hover:bg-muted disabled:opacity-40"
          >
            A−
          </button>
          <button
            type="button"
            aria-label="Larger text"
            disabled={size === SIZES.length - 1}
            onClick={() => changeSize(size + 1)}
            className="h-7.5 w-8.5 rounded-[7px] text-[17px] font-bold hover:bg-muted disabled:opacity-40"
          >
            A+
          </button>
        </fieldset>
      </div>
      <div
        role="progressbar"
        aria-label="Reading progress"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={progress}
        className="h-1.25 shrink-0 bg-muted"
      >
        <div
          className="h-full bg-primary transition-[width] duration-200"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div
        ref={scroller}
        onScroll={onScroll}
        className="min-h-0 flex-1 overflow-y-auto px-4 py-7 tablet:px-8 tablet:py-10"
      >
        <article
          className="mx-auto flex max-w-170 flex-col gap-4.5 leading-[1.7]"
          style={{ fontSize: SIZES[size] }}
        >
          <span className="text-[13px] font-bold text-muted-foreground">
            {[display.label, lengthText(link), collection].filter(Boolean).join(' · ')}
          </span>
          <h1
            id="rd-h"
            className="font-display text-[clamp(26px,4vw,36px)] leading-tight font-extrabold tracking-tight"
          >
            {linkTitle(link)}
          </h1>
          {link.summary && (
            <section
              aria-label="AI summary"
              className="flex flex-col gap-1.5 rounded-[14px] border-2 border-border bg-card px-4 py-3.5 text-[15px] leading-normal"
            >
              <span className="text-xs font-bold tracking-wider text-accent-ink">✦ TL;DR</span>
              <span>{link.summary}</span>
            </section>
          )}
          {(link.type === 'video' || link.type === 'podcast') && href && (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                'relative flex aspect-video items-center justify-center rounded-2xl border-2 border-border text-sticker-ink',
                display.bg,
              )}
            >
              <span className="flex size-16 items-center justify-center rounded-full border-2 border-sticker-ink bg-white">
                <PlayIcon aria-hidden className="size-6 fill-current" />
              </span>
              <span className="absolute bottom-2.5 left-3 rounded-lg border-2 border-sticker-ink bg-white px-2 py-0.5 text-[13px] font-bold">
                {link.type === 'video' ? 'Watch' : 'Listen'} on {link.site}
              </span>
            </a>
          )}
          {link.hasPageCopy && content.isPending ? (
            <div aria-busy="true" className="flex flex-col gap-3">
              {[0, 1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-4 animate-pulse rounded bg-muted"
                  style={{ width: `${95 - i * 12}%` }}
                />
              ))}
            </div>
          ) : link.hasPageCopy && content.isError ? (
            <div className="flex flex-col items-start gap-3">
              <p className="text-muted-foreground">
                We couldn’t load the saved page just now. It’s still saved.
              </p>
              <Button variant="outline" onClick={() => void content.refetch()}>
                Try again
              </Button>
            </div>
          ) : paragraphs ? (
            paragraphs.map((p, i) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: paragraphs of a fixed text
              <p key={i}>{p}</p>
            ))
          ) : (
            link.type !== 'video' &&
            link.type !== 'podcast' && (
              <p className="text-muted-foreground">
                {content.data && 'reason' in content.data && content.data.reason
                  ? content.data.reason
                  : 'Keepmint didn’t keep a copy of this page.'}{' '}
                Read it on the original site instead.
              </p>
            )
          )}
          <div className="mt-3 flex flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-line p-5.5 text-center text-[15px]">
            <strong className="font-display text-[17px]">That’s the end</strong>
            <span className="text-muted-foreground">
              Done with this one? It’ll move to Finished.
            </span>
            <Button size="lg" className="bg-mint text-sticker-ink" onClick={() => void markDone()}>
              ✓ Mark as done
            </Button>
          </div>
          <div className="h-6" />
        </article>
      </div>

      <div className="flex items-center gap-2.5 border-t-2 border-border bg-card px-3.5 py-2.5">
        <span
          aria-live="polite"
          className="min-w-0 flex-1 text-[13px] font-semibold text-muted-foreground"
        >
          {progress}% read{minutesLeft && progress < 100 ? ` · ${minutesLeft} min left` : ''}
        </span>
        {href && (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className={buttonVariants({ variant: 'ghost' })}
          >
            Original
            <ExternalLinkIcon aria-hidden />
          </a>
        )}
        <Button onClick={() => void markDone()}>Done</Button>
      </div>
    </div>
  )
}
