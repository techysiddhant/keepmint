'use client'

import { isLinkBusy, isLinkStuck } from '@keepmint/core'
import {
  BookmarkIcon,
  CheckIcon,
  ExternalLinkIcon,
  FileCheckIcon,
  RotateCwIcon,
  Trash2Icon,
  XIcon,
} from 'lucide-react'
import { useEffect, useEffectEvent, useRef, useState } from 'react'
import { Button, buttonVariants } from '@/components/ui/button'
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/sheet'
import { Textarea } from '@/components/ui/textarea'
import { useIsPhone } from '@/lib/use-media'
import { useNow } from '@/lib/use-now'
import { cn } from '@/lib/utils'
import { useLibraryActions } from './library-actions'
import { formatBytes, LINK_TYPE_DISPLAY, lengthText, linkTitle, timeAgo } from './link-display'
import { useLibrary } from './use-library'

/** Only http(s) links become clickable (saved URLs are checked on the server too). */
export const safeHref = (url: string) => (/^https?:\/\//i.test(url) ? url : undefined)

export function LinkDrawer({ linkId, onClose }: { linkId: string | null; onClose: () => void }) {
  const isPhone = useIsPhone()
  return (
    <Sheet open={linkId !== null} onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        side={isPhone ? 'bottom' : 'right'}
        showCloseButton={false}
        className="gap-0 p-0 tablet:w-110"
      >
        {linkId && <DrawerBody key={linkId} linkId={linkId} onClose={onClose} />}
      </SheetContent>
    </Sheet>
  )
}

function DrawerBody({ linkId, onClose }: { linkId: string; onClose: () => void }) {
  const { links, collections, retryLink } = useLibrary()
  const actions = useLibraryActions()
  const link = links[linkId]
  const now = useNow()
  const [note, setNote] = useState(link?.note ?? '')
  const [tagDraft, setTagDraft] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)

  const savedNote = useRef(link?.note ?? null)
  const saveNote = () => {
    const next = note.trim() ? note : null
    if (!link || next === savedNote.current) return
    savedNote.current = next
    void actions.updateLinks([link.id], { note: next })
  }
  // Save the note however the drawer closes: Escape unmounts the textarea without a blur.
  const saveNoteOnClose = useEffectEvent(saveNote)
  useEffect(() => () => saveNoteOnClose(), [])

  // A deleted or vanished link closes the drawer.
  useEffect(() => {
    if (!link) onClose()
  }, [link, onClose])
  if (!link) return null

  const display = LINK_TYPE_DISPLAY[link.type]
  const busy = isLinkBusy(link) && !isLinkStuck(link, now)
  const collection = link.collectionId ? collections[link.collectionId] : undefined
  const href = safeHref(link.url)
  const sortedCollections = Object.values(collections).sort((a, b) => a.name.localeCompare(b.name))

  const addTag = () => {
    const tag = tagDraft.trim().toLowerCase().replace(/^#/, '').slice(0, 32)
    setTagDraft('')
    if (!tag || link.tags.includes(tag) || link.tags.length >= 20) return
    void actions.updateLinks([link.id], { tags: [...link.tags, tag] })
  }
  const removeTag = (tag: string) =>
    void actions.updateLinks([link.id], { tags: link.tags.filter((t) => t !== tag) })

  return (
    <>
      <div className="flex items-center gap-2.5 border-b-2 border-border py-2.5 pr-3 pl-4.5">
        <span className="flex-1 text-sm font-bold text-muted-foreground">Link details</span>
        <Button variant="ghost" size="icon" aria-label="Close details" onClick={onClose}>
          <XIcon aria-hidden />
        </Button>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-4.5 overflow-y-auto p-4.5">
        <div
          className={cn(
            'relative flex h-32.5 shrink-0 items-center justify-center rounded-2xl border-2 border-border text-sticker-ink',
            display.bg,
          )}
        >
          <display.icon aria-hidden className="size-10.5" strokeWidth={1.8} />
          <span className="absolute top-2.5 left-2.5 flex gap-1.5">
            <span className="rounded-full border-2 border-sticker-ink bg-white px-2 py-0.5 text-xs font-bold">
              {collection?.name ?? 'Unsorted'}
            </span>
            {link.summary && (
              <span className="rounded-full border-2 border-sticker-ink bg-sticker-ink px-2 py-0.5 text-xs font-bold text-white">
                ✦ AI
              </span>
            )}
          </span>
        </div>

        <div className="flex flex-col gap-1.5">
          <span className="text-[13px] font-semibold text-muted-foreground">
            {display.label} · {link.site} · Saved {timeAgo(link.savedAt, now).toLowerCase()}
            {lengthText(link) ? ` · ${lengthText(link)}` : ''}
          </span>
          <SheetTitle className="font-display text-xl leading-tight font-bold tracking-tight">
            {busy ? 'Reading the page…' : linkTitle(link)}
          </SheetTitle>
          <SheetDescription className="sr-only">
            Details, collection, tags and note
          </SheetDescription>
          {href && (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="max-w-full self-start truncate text-sm font-bold text-accent-ink underline underline-offset-3"
            >
              {link.url} ↗
            </a>
          )}
        </div>

        {link.summary ? (
          <section
            aria-label="AI summary"
            className="flex flex-col gap-2 rounded-[14px] border-2 border-border bg-background p-3.5"
          >
            <span className="text-xs font-bold tracking-wider text-accent-ink">✦ AI SUMMARY</span>
            <p>{link.summary}</p>
          </section>
        ) : link.status === 'failed' || isLinkStuck(link, now) ? (
          <div className="flex flex-col items-start gap-2.5 rounded-[14px] border-2 border-border bg-fail-soft p-3.5 text-err-ink">
            <p>{link.failReason ?? 'This is taking too long.'}</p>
            <Button size="sm" onClick={() => void retryLink(link.id)}>
              <RotateCwIcon aria-hidden />
              Retry
            </Button>
          </div>
        ) : link.status === 'no_ai' ? (
          <p className="rounded-[14px] border-2 border-dashed border-line p-3.5 text-sm text-muted-foreground">
            Not summarised — AI sorting was off or used up when this was saved.
          </p>
        ) : null}

        <div className="flex flex-col gap-2">
          <label htmlFor="det-col" className="text-[13px] font-bold">
            Collection
          </label>
          <select
            id="det-col"
            value={link.collectionId ?? ''}
            onChange={(e) =>
              void actions.updateLinks([link.id], { collectionId: e.target.value || null })
            }
            className="h-11 rounded-xl border-2 border-border bg-card px-3 font-bold"
          >
            <option value="">Unsorted</option>
            {sortedCollections.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-[13px] font-bold">Tags</span>
          <div className="flex flex-wrap items-center gap-1.5">
            {link.tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex h-7.5 items-center gap-0.5 rounded-full border-2 border-border pr-1 pl-2.5 text-[13px] font-bold"
              >
                #{tag}
                <button
                  type="button"
                  aria-label={`Remove tag ${tag}`}
                  onClick={() => removeTag(tag)}
                  className="flex size-5.5 items-center justify-center rounded-full hover:bg-muted"
                >
                  <XIcon aria-hidden className="size-2.5" strokeWidth={3.5} />
                </button>
              </span>
            ))}
            <label htmlFor="det-tag" className="sr-only">
              Add a tag, then press Enter
            </label>
            <input
              id="det-tag"
              type="text"
              autoComplete="off"
              placeholder="+ Add tag"
              value={tagDraft}
              onChange={(e) => setTagDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  addTag()
                }
              }}
              className="h-7.5 w-27.5 rounded-full border-2 border-dashed border-line bg-transparent px-2.5 text-[13px] outline-none focus:border-ring"
            />
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="det-note" className="text-[13px] font-bold">
            Your note
          </label>
          <Textarea
            id="det-note"
            rows={3}
            maxLength={5000}
            placeholder="Why did you save this?"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            onBlur={saveNote}
          />
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          <div
            className={cn(
              'flex flex-col rounded-xl border-2 border-border px-3 py-2.5',
              link.hasPageCopy ? 'bg-mint text-sticker-ink' : 'text-muted-foreground',
            )}
          >
            <strong className="flex items-center gap-1.5 text-sm">
              {link.hasPageCopy && <FileCheckIcon aria-hidden className="size-4" />}
              {link.hasPageCopy ? 'Page copy saved' : 'No page copy'}
            </strong>
            <span className="text-xs font-semibold">
              {link.hasPageCopy && link.contentBytes
                ? formatBytes(link.contentBytes)
                : 'Only reading pages are kept'}
            </span>
          </div>
          <Button
            variant={link.readState === 'done' ? 'default' : 'outline'}
            aria-pressed={link.readState === 'done'}
            className="h-auto"
            onClick={() => void actions.setDone([link.id], link.readState !== 'done')}
          >
            <CheckIcon aria-hidden />
            {link.readState === 'done' ? 'Read' : 'Mark read'}
          </Button>
          <Button
            variant={link.readLater ? 'default' : 'outline'}
            aria-pressed={link.readLater}
            className="col-span-2"
            onClick={() => void actions.updateLinks([link.id], { readLater: !link.readLater })}
          >
            <BookmarkIcon aria-hidden />
            {link.readLater ? 'In Read later' : 'Add to Read later'}
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-2.5 border-t-2 border-border px-3.5 py-3">
        {confirmDelete ? (
          <>
            <strong className="flex-1">Delete this link?</strong>
            <Button variant="outline" onClick={() => setConfirmDelete(false)}>
              Cancel
            </Button>
            <Button
              className="bg-pink text-sticker-ink"
              onClick={() => {
                void actions.deleteLinks([link.id])
                onClose()
              }}
            >
              Delete
            </Button>
          </>
        ) : (
          <>
            <Button variant="ghost" className="text-err-ink" onClick={() => setConfirmDelete(true)}>
              <Trash2Icon aria-hidden />
              Delete
            </Button>
            <span className="flex-1" />
            {href && (
              <a href={href} target="_blank" rel="noopener noreferrer" className={buttonVariants()}>
                Open original
                <ExternalLinkIcon aria-hidden />
              </a>
            )}
          </>
        )}
      </div>
    </>
  )
}
