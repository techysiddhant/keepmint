'use client'

import { type LinkStatus, SAMPLE_LINKS } from '@keepmint/core'
import { useForm } from '@tanstack/react-form'
import {
  CheckIcon,
  FolderIcon,
  LinkIcon,
  LoaderCircleIcon,
  RotateCwIcon,
  SearchIcon,
  SparklesIcon,
} from 'lucide-react'
import Link from 'next/link'
import {
  isReading,
  LINK_TYPE_DISPLAY,
  needsRetry,
  STUCK_REASON,
} from '@/components/library/link-display'
import { useLibrary } from '@/components/library/use-library'
import { Badge, linkTypeBadge } from '@/components/ui/badge'
import { Button, buttonVariants } from '@/components/ui/button'
import { Field, FieldError, FieldLabel } from '@/components/ui/field'
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group'
import { submitThenChange } from '@/lib/form'
import { useNow } from '@/lib/use-now'
import { cn } from '@/lib/utils'
import { addLinkSchema } from '@/lib/validation/link'
import { DoneDot, UsageBar } from './shared'

const SAMPLE_COLORS = ['bg-pink', 'bg-sky', 'bg-lilac'] as const

const HOW = [
  {
    title: 'Save anything',
    text: 'Paste a link, or press N anywhere in the app.',
    icon: LinkIcon,
    bg: 'bg-yellow',
    rot: '-rotate-6',
  },
  {
    title: 'AI reads and files it',
    text: 'A two-line summary, tags and the right collection.',
    icon: SparklesIcon,
    bg: 'bg-lilac',
    rot: 'rotate-3',
  },
  {
    title: 'Find it later',
    text: 'Describe what you remember. It finds it.',
    icon: SearchIcon,
    bg: 'bg-mint',
    rot: '-rotate-3',
  },
] as const

/**
 * The welcome dashboard for a new user: save a first link right here, watch it get read,
 * summarised and filed, then see the setup checklist.
 */
export function FirstRun({
  name,
  linkId,
  onLinkId,
}: {
  name: string
  linkId: string | null
  onLinkId: (id: string | null) => void
}) {
  const { links, collections, usage, retryLink } = useLibrary()
  const now = useNow()
  const link = linkId ? links[linkId] : undefined
  const hasLinks = Object.keys(links).length > 0

  return (
    <div className="mx-auto flex max-w-290 flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="font-display text-[clamp(26px,4vw,34px)] leading-tight font-extrabold tracking-tight">
          Welcome to Keepmint{name ? `, ${name}` : ''}
        </h1>
        <p className="text-muted-foreground">
          Let’s get your first links in. It takes about a minute.
        </p>
      </div>

      <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-6 desktop:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <div className="flex flex-col gap-6">
          <section
            aria-labelledby="first-link-h"
            className="relative flex flex-col gap-3.5 overflow-hidden rounded-[22px] border-2 border-border bg-card p-5 tablet:p-6"
          >
            <span
              aria-hidden
              className="absolute top-4 right-4.5 size-7.5 rotate-14 rounded-[9px] border-2 border-sticker-ink bg-pink"
            />
            <div className="flex items-center gap-2.5">
              <span className="flex size-7 shrink-0 items-center justify-center rounded-full border-2 border-sticker-ink bg-yellow text-[13px] font-extrabold text-sticker-ink">
                1
              </span>
              <h2 id="first-link-h" className="font-display text-lg font-bold tracking-tight">
                Save your first link
              </h2>
            </div>
            {!link ? (
              <FirstLinkForm onSaved={onLinkId} />
            ) : isReading(link, now) ? (
              <Steps status={link.status} site={link.site ?? 'link'} />
            ) : needsRetry(link, now) ? (
              <div className="flex flex-col gap-3">
                <p className="rounded-[14px] border-2 border-border bg-fail-soft p-3.5 text-err-ink">
                  <strong>That one didn’t work.</strong> {link.failReason ?? STUCK_REASON}
                </p>
                <div className="flex flex-wrap gap-2.5">
                  <Button onClick={() => void retryLink(link.id)}>
                    <RotateCwIcon aria-hidden />
                    Retry
                  </Button>
                  <Button variant="outline" onClick={() => onLinkId(null)}>
                    Try another link
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-3 animate-in fade-in-0 zoom-in-95">
                <div className="flex gap-3.5 rounded-2xl border-2 border-border bg-background p-3.5">
                  <span
                    aria-hidden
                    className={cn(
                      'flex h-14 w-18 shrink-0 items-center justify-center rounded-xl border-2 border-sticker-ink text-sticker-ink',
                      LINK_TYPE_DISPLAY[link.type].bg,
                    )}
                  >
                    {(() => {
                      const Icon = LINK_TYPE_DISPLAY[link.type].icon
                      return <Icon className="size-6" strokeWidth={2} />
                    })()}
                  </span>
                  <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                    <strong className="leading-snug">{link.title ?? link.url}</strong>
                    {link.summary && (
                      <span className="text-sm text-muted-foreground">{link.summary}</span>
                    )}
                    <div className="mt-0.5 flex flex-wrap gap-1.5">
                      <Badge variant={linkTypeBadge[link.type]}>
                        {LINK_TYPE_DISPLAY[link.type].label}
                      </Badge>
                      {link.collectionId && collections[link.collectionId] ? (
                        <Badge variant="yellow">
                          <FolderIcon aria-hidden />
                          Filed in {collections[link.collectionId]?.name}
                        </Badge>
                      ) : (
                        <Badge variant="secondary">
                          {link.status === 'needs_review'
                            ? `AI suggests “${link.aiSuggestedCollection ?? 'Unsorted'}”`
                            : 'In Unsorted'}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">
                  <strong className="text-foreground">That’s the whole idea.</strong>{' '}
                  {link.status === 'no_ai'
                    ? 'This one was saved without a summary because AI sorting is off or used up for today.'
                    : 'Save anything and Keepmint reads it, summarises it and files it for you.'}
                </p>
                <div className="flex flex-wrap gap-2.5">
                  <Button variant="outline" onClick={() => onLinkId(null)}>
                    Save another
                  </Button>
                  <Link href="/app/links" className={buttonVariants()}>
                    See it in All links
                  </Link>
                </div>
              </div>
            )}
          </section>

          <section
            aria-labelledby="setup-h"
            className="flex flex-col gap-3 rounded-[22px] border-2 border-border bg-card p-5 tablet:p-6"
          >
            <div className="flex items-center gap-3">
              <h2 id="setup-h" className="flex-1 font-display text-[17px] font-bold tracking-tight">
                Get set up
              </h2>
              <span className="text-sm font-bold">{hasLinks ? 1 : 0} of 3 done</span>
            </div>
            <div
              role="progressbar"
              aria-label="Setup progress"
              aria-valuemin={0}
              aria-valuemax={3}
              aria-valuenow={hasLinks ? 1 : 0}
              className="h-3 overflow-hidden rounded-full border-2 border-border"
            >
              <div
                className="h-full bg-mint transition-[width] duration-500"
                style={{ width: hasLinks ? '33.4%' : '0%' }}
              />
            </div>
            <ul className="flex flex-col">
              <ChecklistItem
                done={hasLinks}
                title="Save your first link"
                sub="Paste anything above. AI sorts it in a few seconds."
              />
              <ChecklistItem
                title="Install Keepmint on this device"
                sub="Opens like an app and works offline."
                soon
              />
              <ChecklistItem
                title="Import your browser bookmarks"
                sub="Bring everything over from Chrome, Firefox or Safari."
                soon
              />
            </ul>
          </section>
        </div>

        <div className="flex flex-col gap-6">
          {usage && (
            <section
              aria-labelledby="ai-h"
              className="flex flex-col gap-2.5 rounded-[20px] border-2 border-border bg-card p-4.5"
            >
              <div className="flex items-baseline justify-between gap-2">
                <h2 id="ai-h" className="text-[15px] font-bold">
                  AI sorts today
                </h2>
                <span className="font-display text-xl font-extrabold">
                  {usage.used}{' '}
                  <span className="font-sans text-sm font-semibold text-muted-foreground">
                    / {usage.limit}
                  </span>
                </span>
              </div>
              <UsageBar usage={usage} />
              <p className="text-[13px] text-muted-foreground">
                The free beta includes {usage.limit} AI sorts a day. Links past that are still
                saved, just not summarised.
              </p>
            </section>
          )}
          <section
            aria-labelledby="how-h"
            className="flex flex-col gap-3 rounded-[20px] border-2 border-border bg-card p-4.5"
          >
            <h2 id="how-h" className="text-[15px] font-bold">
              How Keepmint works
            </h2>
            {HOW.map(({ title, text, icon: Icon, bg, rot }) => (
              <div key={title} className="flex items-start gap-3">
                <span
                  aria-hidden
                  className={cn(
                    'flex size-9 shrink-0 items-center justify-center rounded-[10px] border-2 border-sticker-ink text-sticker-ink',
                    bg,
                    rot,
                  )}
                >
                  <Icon className="size-4.25" strokeWidth={2.3} />
                </span>
                <span className="flex flex-col leading-snug">
                  <strong>{title}</strong>
                  <span className="text-sm text-muted-foreground">{text}</span>
                </span>
              </div>
            ))}
          </section>
        </div>
      </div>
    </div>
  )
}

function FirstLinkForm({ onSaved }: { onSaved: (id: string) => void }) {
  const { addLink } = useLibrary()
  const form = useForm({
    defaultValues: { url: '', readLater: false },
    validationLogic: submitThenChange,
    validators: { onDynamic: addLinkSchema },
    onSubmit: async ({ value }) => {
      const saved = await addLink(value.url.trim())
      if (saved) onSaved(saved.id)
    },
  })

  return (
    <form
      noValidate
      className="flex flex-col gap-3"
      onSubmit={(e) => {
        e.preventDefault()
        void form.handleSubmit()
      }}
    >
      <form.Field name="url">
        {(field) => {
          const invalid = !field.state.meta.isValid
          return (
            <Field data-invalid={invalid} className="gap-2">
              <FieldLabel htmlFor="first-url" className="sr-only">
                Link to save
              </FieldLabel>
              <div className="flex flex-wrap gap-2.5">
                <InputGroup className="h-13.5 min-w-0 flex-[1_1_240px]">
                  <InputGroupInput
                    id="first-url"
                    type="url"
                    inputMode="url"
                    autoComplete="off"
                    placeholder="Paste any link: article, video, recipe, repo…"
                    className="text-base"
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    aria-invalid={invalid}
                  />
                  <InputGroupAddon>
                    <LinkIcon aria-hidden />
                  </InputGroupAddon>
                </InputGroup>
                <form.Subscribe selector={(s) => s.isSubmitting}>
                  {(busy) => (
                    <Button
                      type="submit"
                      size="lg"
                      disabled={busy}
                      className="h-13.5 flex-[1_1_auto] tablet:flex-none"
                    >
                      {busy ? 'Saving…' : 'Save link'}
                    </Button>
                  )}
                </form.Subscribe>
              </div>
              {invalid && <FieldError errors={field.state.meta.errors} />}
            </Field>
          )
        }}
      </form.Field>
      <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
        <span>No link handy? Try one:</span>
        {SAMPLE_LINKS.map((sample, i) => (
          <button
            key={sample.url}
            type="button"
            className={cn(
              'rounded-full border-2 border-sticker-ink px-2.5 py-1 text-[13px] font-bold text-sticker-ink',
              SAMPLE_COLORS[i],
            )}
            onClick={() => {
              form.setFieldValue('url', sample.url)
              void form.handleSubmit()
            }}
          >
            {sample.label}
          </button>
        ))}
      </div>
    </form>
  )
}

/** "Reading the page → Summarising → Filing it", driven by the link's real status. */
function Steps({ status, site }: { status: LinkStatus; site: string }) {
  // queued: the worker hasn't picked it up yet; processing: reading, then the AI call.
  const phase = status === 'queued' ? 1 : 2
  const steps = [
    ['Reading the page', `opening ${site}`],
    ['Summarising', 'pulling the key points'],
    ['Filing it', 'picking a collection'],
  ] as const
  return (
    <ol aria-live="polite" className="flex flex-col gap-2.5">
      {steps.map(([label, note], i) => {
        const state = phase > i + 1 ? 'done' : phase === i + 1 ? 'now' : 'wait'
        return (
          <li
            key={label}
            className={cn(
              'flex items-center gap-3 rounded-[14px] border-2 px-3.5 py-3 font-bold transition-colors duration-300',
              state === 'done' && 'border-sticker-ink bg-mint text-sticker-ink',
              state === 'now' && 'border-sticker-ink bg-yellow text-sticker-ink',
              state === 'wait' && 'border-line text-muted-foreground',
            )}
          >
            <span
              aria-hidden
              className="flex size-6.5 shrink-0 items-center justify-center rounded-full border-2 border-current"
            >
              {state === 'done' && <CheckIcon className="size-3.25" strokeWidth={4} />}
              {state === 'now' && (
                <LoaderCircleIcon className="size-3.5 animate-spin" strokeWidth={3} />
              )}
            </span>
            <span className="flex-1">{label}</span>
            {state !== 'wait' && (
              <span className="text-[13px] font-semibold opacity-80">{note}</span>
            )}
          </li>
        )
      })}
    </ol>
  )
}

function ChecklistItem({
  title,
  sub,
  done = false,
  soon = false,
}: {
  title: string
  sub: string
  done?: boolean
  soon?: boolean
}) {
  return (
    <li className="flex items-center gap-3 border-t-2 border-line py-3 first:border-t-0">
      <DoneDot done={done} />
      <span className="flex min-w-0 flex-1 flex-col leading-snug">
        <strong className={cn(done && 'text-muted-foreground line-through')}>{title}</strong>
        <span className="text-[13px] text-muted-foreground">{sub}</span>
        <span className="sr-only">{done ? ' (done)' : ' (to do)'}</span>
      </span>
      {soon && <Badge variant="secondary">Coming soon</Badge>}
    </li>
  )
}
