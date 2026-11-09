'use client'

import { COLLECTION_COLORS, type SyncLink } from '@keepmint/core'
import { CheckIcon, SparklesIcon } from 'lucide-react'
import { useState } from 'react'
import { useLibraryActions } from '@/components/library/library-actions'
import { linkTitle } from '@/components/library/link-display'
import { useLibrary } from '@/components/library/use-library'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { cn } from '@/lib/utils'

/** One choice for a link: an existing collection, a new one named by the AI, or Unsorted. */
type Option = { key: string; label: string } & (
  | { collectionId: string | null }
  | { newName: string }
)

/**
 * "Check where these go": links the AI wasn't sure about. Each shows its suggestion first;
 * the user picks and confirms. Picks are saved as examples so similar links file better.
 */
export function ReviewDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
}) {
  const { links } = useLibrary()
  const pending = Object.values(links)
    .filter((l) => l.status === 'needs_review')
    .sort((a, b) => b.savedAt.localeCompare(a.savedAt))
  const [confirmed, setConfirmed] = useState<Set<string>>(new Set())

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o)
        if (!o) setConfirmed(new Set())
      }}
    >
      <DialogContent className="max-h-[90dvh] gap-3.5 overflow-y-auto sm:max-w-140">
        <div className="flex items-center gap-3 pr-10">
          <span
            aria-hidden
            className="flex size-10 shrink-0 items-center justify-center rounded-xl border-2 border-border bg-yellow text-sticker-ink"
          >
            <SparklesIcon className="size-5" strokeWidth={2.2} />
          </span>
          <div className="flex flex-col">
            <DialogTitle className="pr-0">Check where these go</DialogTitle>
            <DialogDescription>Pick a collection, then confirm.</DialogDescription>
          </div>
        </div>
        {pending.map((l) => (
          <ReviewItem
            key={l.id}
            link={l}
            onConfirmed={() => setConfirmed((s) => new Set(s).add(l.id))}
          />
        ))}
        {pending.length === 0 && (
          <p
            role="status"
            className="rounded-[14px] border-2 border-border bg-mint p-3.5 font-semibold text-sticker-ink"
          >
            All sorted. Keepmint will use your picks to file similar links.
            {confirmed.size > 0 && ` (${confirmed.size} confirmed)`}
          </p>
        )}
      </DialogContent>
    </Dialog>
  )
}

function ReviewItem({ link, onConfirmed }: { link: SyncLink; onConfirmed: () => void }) {
  const { collections, links } = useLibrary()
  const actions = useLibraryActions()

  const all = Object.values(collections)
  const suggested = link.aiSuggestedCollection
  const match = suggested
    ? all.find((c) => c.name.toLowerCase() === suggested.toLowerCase())
    : undefined
  // Then the collections the user files into most.
  const counts = new Map<string, number>()
  for (const l of Object.values(links)) {
    if (l.collectionId) counts.set(l.collectionId, (counts.get(l.collectionId) ?? 0) + 1)
  }
  const popular = all
    .filter((c) => c.id !== match?.id)
    .sort((a, b) => (counts.get(b.id) ?? 0) - (counts.get(a.id) ?? 0))
    .slice(0, 4)
  const options: Option[] = []
  if (match) options.push({ key: match.id, label: match.name, collectionId: match.id })
  else if (suggested) options.push({ key: 'new', label: `＋ ${suggested}`, newName: suggested })
  for (const c of popular) options.push({ key: c.id, label: c.name, collectionId: c.id })
  options.push({ key: 'unsorted', label: 'Unsorted', collectionId: null })

  const [choice, setChoice] = useState(options[0]?.key ?? 'unsorted')
  const [busy, setBusy] = useState(false)
  const picked = options.find((o) => o.key === choice) ?? options[0]

  const confirm = async () => {
    if (!picked) return
    setBusy(true)
    const color =
      COLLECTION_COLORS[Object.keys(collections).length % COLLECTION_COLORS.length] ?? 'violet'
    const ok = await actions.reviewLink(
      link.id,
      'newName' in picked
        ? { newName: picked.newName, color }
        : { collectionId: picked.collectionId },
    )
    setBusy(false)
    if (ok) onConfirmed()
  }

  return (
    <div className="flex flex-col gap-2.5 rounded-[14px] border-2 border-border p-3.5">
      <div className="flex min-w-0 flex-col">
        <strong className="truncate">{linkTitle(link)}</strong>
        <span className="text-[13px] text-muted-foreground">
          {link.site} · AI suggested “{link.aiSuggestedCollection ?? 'Unsorted'}”
        </span>
      </div>
      <div
        role="radiogroup"
        aria-label={`Collection for ${linkTitle(link)}`}
        className="flex flex-wrap gap-1.5"
      >
        {options.map((o) => (
          // biome-ignore lint/a11y/useSemanticElements: chip-style radio from the design
          <button
            key={o.key}
            type="button"
            role="radio"
            aria-checked={choice === o.key}
            onClick={() => setChoice(o.key)}
            className={cn(
              'h-8 rounded-full border-2 border-border px-3 text-[13px] font-bold',
              choice === o.key ? 'bg-foreground text-background' : 'bg-card hover:bg-muted',
            )}
          >
            {o.label}
          </button>
        ))}
      </div>
      <Button size="sm" className="self-start" disabled={busy} onClick={() => void confirm()}>
        <CheckIcon aria-hidden />
        Confirm “{picked && 'newName' in picked ? picked.newName : picked?.label}”
      </Button>
    </div>
  )
}
