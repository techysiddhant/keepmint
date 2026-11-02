'use client'

import { CheckIcon, LinkIcon, Loader2Icon } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { cn } from '@/lib/utils'

// Runs entirely in the browser: no API calls and no AI. It only shows how saving feels.

const SAMPLES = [
  {
    label: 'YouTube video',
    url: 'youtube.com/watch?v=crispy-chili-oil',
    type: 'Video · 11:42',
    title: 'Crispy chili oil, three ways',
    summary:
      'Three methods compared. Key step at 4:10 — steep the aromatics low before adding chili.',
    col: 'Kitchen',
    card: 'bg-pink text-sticker-ink',
  },
  {
    label: 'Article',
    url: 'blog.example.dev/async-rust-executors',
    type: 'Article · 14 min',
    title: 'How the async executor actually polls',
    summary: 'Builds a toy executor to explain wakers and polling, step by step.',
    col: 'Rust & systems',
    card: 'bg-yellow text-sticker-ink',
  },
  {
    label: 'GitHub repo',
    url: 'github.com/tokio-rs/mini-redis',
    type: 'Repo · Rust',
    title: 'tokio-rs / mini-redis',
    summary: 'A small Redis clone built to teach Tokio. A good weekend starter project.',
    col: 'Side projects',
    card: 'bg-mint text-sticker-ink',
  },
  {
    label: 'Thread',
    url: 'x.com/designer/status/empty-states',
    type: 'Thread · 9 posts',
    title: '9 rules for better empty states',
    summary: 'Explain what happened, guide the next step, then offer one clear action.',
    col: 'Design refs',
    card: 'bg-violet text-white',
  },
]
const COLS = [
  { name: 'Kitchen', count: 17, dot: 'bg-pink', hl: 'bg-pink text-sticker-ink' },
  { name: 'Rust & systems', count: 33, dot: 'bg-yellow', hl: 'bg-yellow text-sticker-ink' },
  { name: 'Side projects', count: 20, dot: 'bg-mint', hl: 'bg-mint text-sticker-ink' },
  { name: 'Design refs', count: 51, dot: 'bg-violet', hl: 'bg-violet text-white' },
]
const STEPS = ['Reading the page', 'Writing summary & tags', 'Filing into a collection']

type Phase = 'idle' | 'run' | 'filed' | 'queued' | 'syncing' | 'synced'

export function LiveDemo() {
  const [sample, setSample] = useState(0)
  const [phase, setPhase] = useState<Phase>('idle')
  const [step, setStep] = useState(0)
  const [filed, setFiled] = useState(0)
  const [online, setOnline] = useState(true)
  const [queue, setQueue] = useState<number[]>([])
  const [added, setAdded] = useState<Record<string, number>>({})
  const [flash, setFlash] = useState<string | null>(null)
  const [synced, setSynced] = useState(0)
  const timers = useRef<ReturnType<typeof setTimeout>[]>([])
  const later = (fn: () => void, ms: number) => timers.current.push(setTimeout(fn, ms))
  useEffect(() => () => timers.current.forEach(clearTimeout), [])

  const busy = phase === 'run' || phase === 'syncing'
  const bump = (cols: string[]) =>
    setAdded((a) => {
      const next = { ...a }
      for (const c of cols) next[c] = (next[c] ?? 0) + 1
      return next
    })

  function pick(i: number) {
    if (busy) return
    setSample(i)
    setPhase((p) => (p === 'queued' ? p : 'idle'))
  }

  function save() {
    if (busy) return
    if (!online) {
      setQueue((q) => (q.includes(sample) ? q : [...q, sample]))
      setPhase('queued')
      return
    }
    const col = SAMPLES[sample]?.col ?? ''
    setPhase('run')
    setStep(0)
    later(() => setStep(1), 850)
    later(() => setStep(2), 1700)
    later(() => {
      setPhase('filed')
      setStep(3)
      setFiled(sample)
      setFlash(col)
      bump([col])
    }, 2550)
    later(() => setFlash(null), 4200)
  }

  function toggleOnline() {
    if (busy) return
    if (online) return setOnline(false)
    setOnline(true)
    if (!queue.length) return
    setPhase('syncing')
    later(() => {
      bump(queue.map((i) => SAMPLES[i]?.col ?? ''))
      setSynced(queue.length)
      setFlash(SAMPLES[queue[queue.length - 1] ?? 0]?.col ?? null)
      setQueue([])
      setPhase('synced')
    }, 1800)
    later(() => setFlash(null), 3600)
  }

  const card = SAMPLES[filed]
  const netLabel = online
    ? phase === 'syncing'
      ? 'Syncing…'
      : 'Online'
    : queue.length
      ? `Offline · ${queue.length} queued`
      : 'Offline'

  return (
    <div
      id="demo"
      className="min-w-0 flex-[1.25_1_500px] scroll-mt-28 animate-rise overflow-hidden rounded-[22px] border-2 border-border bg-card shadow-[5px_5px_0_var(--shadow)] [animation-delay:.16s]"
    >
      <div className="flex flex-wrap items-center gap-2.5 border-b-2 border-border bg-background py-2.5 pr-3 pl-4">
        <span aria-hidden className="flex gap-1.5">
          {['bg-pink', 'bg-yellow', 'bg-mint'].map((c) => (
            <span key={c} className={`size-3 rounded-full border-2 border-border ${c}`} />
          ))}
        </span>
        <span className="flex-1 text-sm font-bold">Live demo — try it</span>
        <span
          aria-live="polite"
          className="hidden text-[13px] font-semibold text-muted-foreground min-[420px]:inline"
        >
          {netLabel}
        </span>
        <Label className="flex h-9 items-center gap-2 rounded-full border-2 border-border bg-card pr-3 pl-1.5 text-[13px]">
          <Switch size="sm" checked={online} onCheckedChange={toggleOnline} aria-label="Wi-Fi" />
          {online ? 'Wi-Fi on' : 'Wi-Fi off'}
        </Label>
      </div>
      <div className="flex flex-wrap">
        <div className="flex min-w-0 flex-[1_1_170px] flex-row gap-1.5 overflow-x-auto border-b-2 border-border p-3.5 tablet:flex-col tablet:overflow-visible tablet:border-r-2 tablet:border-b-0">
          <span className="hidden text-xs font-bold tracking-[.06em] text-muted-foreground tablet:inline">
            COLLECTIONS
          </span>
          {COLS.map((c) => (
            <div
              key={c.name}
              className={cn(
                'flex shrink-0 items-center justify-between gap-2.5 rounded-[10px] border-2 px-2.5 py-2 text-sm font-bold whitespace-nowrap transition-colors duration-300',
                flash === c.name ? `border-foreground ${c.hl}` : 'border-transparent',
              )}
            >
              <span className="flex items-center gap-2">
                <span
                  aria-hidden
                  className={`size-2.5 rounded-[3px] border-[1.5px] border-sticker-ink ${c.dot}`}
                />
                {c.name}
              </span>
              <span className="text-xs">{c.count + (added[c.name] ?? 0)}</span>
            </div>
          ))}
        </div>
        <div className="flex min-w-0 flex-[3_1_320px] flex-col gap-3.5 p-[18px]">
          <span className="text-[13px] font-bold text-muted-foreground">1 · Pick a link</span>
          <div className="flex flex-wrap gap-2">
            {SAMPLES.map((s, i) => (
              <Button
                key={s.label}
                size="sm"
                variant={i === sample ? 'sticker' : 'secondary'}
                aria-pressed={i === sample}
                onClick={() => pick(i)}
                className="rounded-full text-[13px] shadow-none hover:shadow-none"
              >
                {s.label}
              </Button>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            <div className="flex h-[50px] min-w-0 flex-[1_1_200px] items-center gap-2 rounded-xl border-2 border-border bg-background px-3.5 text-sm">
              <LinkIcon className="size-4 shrink-0 text-muted-foreground" aria-hidden />
              <span className="truncate">{SAMPLES[sample]?.url}</span>
            </div>
            <Button size="lg" onClick={save}>
              {phase === 'run' ? 'Saving…' : online ? 'Save' : 'Save offline'}
            </Button>
          </div>
          <span className="text-[13px] font-bold text-muted-foreground">
            2 · Watch Keepmint work
          </span>
          <div className="flex flex-col gap-2">
            {STEPS.map((label, j) => {
              const done = phase === 'filed' || (phase === 'run' && j < step)
              const active = phase === 'run' && j === step
              return (
                <div
                  key={label}
                  className={cn(
                    'flex items-center gap-2.5 font-semibold transition-colors',
                    done || active ? 'text-foreground' : 'text-muted-foreground',
                  )}
                >
                  {done ? (
                    <span
                      aria-hidden
                      className="flex size-[22px] animate-pop items-center justify-center rounded-full border-2 border-sticker-ink bg-mint text-sticker-ink"
                    >
                      <CheckIcon className="size-3" strokeWidth={3} />
                    </span>
                  ) : active ? (
                    <Loader2Icon className="size-[22px] animate-spin" aria-hidden />
                  ) : (
                    <span
                      aria-hidden
                      className="size-[22px] rounded-full border-2 border-dashed border-line"
                    />
                  )}
                  {label}
                </div>
              )
            })}
          </div>
          <div aria-live="polite" className="flex min-h-[150px] flex-col">
            {phase === 'idle' && (
              <div className="flex flex-1 flex-col justify-center gap-1.5 rounded-2xl border-2 border-dashed border-line p-[18px] text-muted-foreground">
                <strong className="text-foreground">Hit Save and watch it file itself.</strong>
                Then flip the Wi-Fi switch off and save again — Keepmint keeps working.
              </div>
            )}
            {phase === 'run' && (
              <div className="flex flex-1 flex-col gap-2.5 rounded-2xl border-2 border-border p-[18px]">
                {['w-2/5 h-3.5', 'w-[85%] h-5', 'w-full h-3', 'w-[70%] h-3'].map((w) => (
                  <span key={w} className={`animate-pulse rounded-md bg-muted ${w}`} />
                ))}
              </div>
            )}
            {phase === 'filed' && card && (
              <div
                className={`flex flex-1 animate-pop flex-col gap-2 rounded-2xl border-2 border-border p-[18px] ${card.card}`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2.5">
                  <span className="rounded-full border-2 border-sticker-ink bg-white px-2.5 py-0.5 text-[13px] font-bold text-sticker-ink">
                    {card.col}
                  </span>
                  <span className="text-[13px] font-semibold">{card.type}</span>
                </div>
                <span className="font-display text-lg leading-tight font-bold">{card.title}</span>
                <span>{card.summary}</span>
                <span className="text-[13px] font-bold">✓ Filed · tagged · available offline</span>
              </div>
            )}
            {phase === 'queued' && (
              <div className="flex flex-1 animate-pop flex-col justify-center gap-1.5 rounded-2xl border-2 border-dashed border-border p-[18px]">
                <strong className="font-display text-[17px]">Saved on this device</strong>
                <span className="text-muted-foreground">
                  {queue.length === 1 ? '1 link is waiting.' : `${queue.length} links are waiting.`}{' '}
                  Turn Wi-Fi back on and Keepmint sorts them automatically.
                </span>
              </div>
            )}
            {phase === 'syncing' && (
              <div className="flex flex-1 items-center gap-3 rounded-2xl border-2 border-border p-[18px] font-bold">
                <Loader2Icon className="size-5 animate-spin" aria-hidden />
                Back online — reading your queued links…
              </div>
            )}
            {phase === 'synced' && (
              <div className="flex flex-1 animate-pop flex-col justify-center gap-1.5 rounded-2xl border-2 border-border bg-mint p-[18px] text-sticker-ink">
                <strong className="font-display text-[17px]">All caught up</strong>
                <span>
                  Back online — Keepmint read and filed {synced} queued{' '}
                  {synced === 1 ? 'link' : 'links'}.
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
