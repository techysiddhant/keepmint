'use client'

import type { AiUsage, SyncLink } from '@keepmint/core'
import { CheckIcon, LoaderCircleIcon } from 'lucide-react'
import { isReading, LINK_TYPE_DISPLAY, needsRetry } from '@/components/library/link-display'
import { useNow } from '@/lib/use-now'
import { cn } from '@/lib/utils'

/** "Good afternoon" in the user's own time zone. */
export function greeting(timeZone: string, now: number) {
  let hour = new Date(now).getHours()
  try {
    hour = Number(
      new Intl.DateTimeFormat('en-GB', { hour: 'numeric', hourCycle: 'h23', timeZone }).format(
        new Date(now),
      ),
    )
  } catch {}
  return hour < 5
    ? 'Good evening'
    : hour < 12
      ? 'Good morning'
      : hour < 18
        ? 'Good afternoon'
        : 'Good evening'
}

export function firstName(name: string) {
  return name.trim().split(/\s+/)[0] ?? ''
}

/** The coloured square with a link-type icon (or a spinner while it's being read). */
export function LinkThumb({ link, className }: { link: SyncLink; className?: string }) {
  const now = useNow()
  const display = LINK_TYPE_DISPLAY[link.type]
  const busy = isReading(link, now)
  return (
    <span
      aria-hidden
      className={cn(
        'flex size-8 shrink-0 items-center justify-center rounded-[10px] border-2 border-border text-sticker-ink',
        busy
          ? 'bg-primary text-primary-foreground'
          : needsRetry(link, now)
            ? 'bg-fail-soft text-err-ink'
            : display.bg,
        className,
      )}
    >
      {busy ? (
        <LoaderCircleIcon className="size-4 animate-spin" strokeWidth={2.6} />
      ) : (
        <display.icon className="size-4" strokeWidth={2.4} />
      )}
    </span>
  )
}

/** Today's AI sorts as a labelled progress bar. */
export function UsageBar({ usage, className }: { usage: AiUsage; className?: string }) {
  const pct = usage.limit > 0 ? Math.min(100, Math.round((usage.used / usage.limit) * 100)) : 100
  return (
    <div
      role="progressbar"
      aria-label="AI sorts used today"
      aria-valuemin={0}
      aria-valuemax={usage.limit}
      aria-valuenow={usage.used}
      className={cn('h-3 overflow-hidden rounded-full border-2 border-border bg-card', className)}
    >
      <div
        className={cn('h-full transition-[width] duration-500', pct >= 100 ? 'bg-pink' : 'bg-mint')}
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}

export function DoneDot({ done }: { done: boolean }) {
  return (
    <span
      aria-hidden
      className={cn(
        'flex size-7 shrink-0 items-center justify-center rounded-full border-2 border-border transition-colors',
        done && 'bg-mint text-sticker-ink',
      )}
    >
      {done && <CheckIcon className="size-3.5" strokeWidth={4} />}
    </span>
  )
}
