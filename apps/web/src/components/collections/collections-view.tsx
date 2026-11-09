'use client'

import { COLLECTION_COLORS, type SyncCollection, type SyncLink } from '@keepmint/core'
import { FolderIcon, PlusIcon, SparklesIcon } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { useAddLink } from '@/components/library/add-link'
import { EmptyState } from '@/components/library/empty-state'
import { useLibraryActions } from '@/components/library/library-actions'
import { COLLECTION_BG, LINK_TYPE_DISPLAY, timeAgo } from '@/components/library/link-display'
import { useLibrary } from '@/components/library/use-library'
import { Button } from '@/components/ui/button'
import { useNow } from '@/lib/use-now'
import { cn } from '@/lib/utils'
import { CollectionDialog } from './collection-dialog'

const TILT = ['-rotate-6', 'rotate-3', '-rotate-2'] as const

/** Latest activity in a collection: its own edits or the newest link saved into it. */
function lastUpdated(c: SyncCollection, inside: SyncLink[]) {
  // ISO timestamps sort as text, so the last one after sorting is the latest.
  return [c.updatedAt, ...inside.map((l) => l.savedAt)].sort().at(-1) ?? c.updatedAt
}

export function CollectionsView() {
  const { collections, links, suggestions, loaded } = useLibrary()
  const actions = useLibraryActions()
  const router = useRouter()
  const { open: openAddLink } = useAddLink()
  const [creating, setCreating] = useState(false)
  const now = useNow()

  const byCollection = new Map<string, SyncLink[]>()
  for (const l of Object.values(links)) {
    if (!l.collectionId) continue
    const list = byCollection.get(l.collectionId) ?? []
    list.push(l)
    byCollection.set(l.collectionId, list)
  }
  const cards = Object.values(collections)
    .map((c) => {
      const inside = (byCollection.get(c.id) ?? []).sort((a, b) =>
        b.savedAt.localeCompare(a.savedAt),
      )
      return { c, inside, updated: lastUpdated(c, inside) }
    })
    .sort((a, b) => Number(b.c.pinned) - Number(a.c.pinned) || b.updated.localeCompare(a.updated))

  const unsorted = Object.values(links).filter((l) => !l.collectionId).length
  // Each accepted suggestion gets the next colour in the palette.
  const nextColor =
    COLLECTION_COLORS[Object.keys(collections).length % COLLECTION_COLORS.length] ?? 'violet'

  if (!loaded) return <div className="h-64 animate-pulse rounded-[20px] bg-muted" />

  return (
    <div className="mx-auto flex max-w-290 flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3.5">
        <div className="flex flex-col gap-1">
          <h1 className="font-display text-[clamp(26px,4vw,34px)] leading-tight font-extrabold tracking-tight">
            Collections
          </h1>
          <p className="text-muted-foreground">
            {cards.length
              ? `${cards.length} ${cards.length === 1 ? 'collection' : 'collections'} · ${unsorted} unsorted`
              : 'Your library’s shelves'}
          </p>
        </div>
        <Button size="lg" onClick={() => setCreating(true)}>
          <PlusIcon aria-hidden strokeWidth={2.8} />
          New collection
        </Button>
      </div>

      {suggestions.map((s) => (
        <div
          key={s.id}
          className="flex flex-wrap items-center gap-3.5 rounded-[18px] border-2 border-border bg-yellow px-4.5 py-4 text-sticker-ink"
        >
          <span
            aria-hidden
            className="flex size-11 shrink-0 items-center justify-center rounded-xl border-2 border-sticker-ink bg-white"
          >
            <SparklesIcon className="size-5.5" strokeWidth={2.2} />
          </span>
          <div className="flex min-w-60 flex-1 flex-col gap-0.5">
            <strong className="text-base">Make a “{s.name}” collection?</strong>
            <span className="text-sm">{s.reason}</span>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={() => void actions.acceptSuggestion(s, nextColor)}>Create it</Button>
            <Button
              variant="link"
              className="text-sticker-ink"
              onClick={() => void actions.dismissSuggestion(s.id)}
            >
              Not now
            </Button>
          </div>
        </div>
      ))}

      {cards.length === 0 ? (
        <EmptyState
          icon={FolderIcon}
          colors={['bg-lilac', 'bg-mint']}
          title="Collections build themselves"
          actions={
            <>
              <Button onClick={() => openAddLink()}>Save a few links</Button>
              <Button variant="outline" onClick={() => setCreating(true)}>
                New collection
              </Button>
            </>
          }
        >
          As you save, Keepmint files links into collections like “Recipes” or “Design inspiration”.
          You can also make your own any time.
        </EmptyState>
      ) : (
        <div className="grid grid-cols-1 gap-4.5 tablet:grid-cols-2 desktop:grid-cols-3">
          {cards.map(({ c, inside, updated }) => (
            <Link
              key={c.id}
              href={`/app/collections/${c.id}`}
              aria-label={`${c.name}, ${inside.length} ${inside.length === 1 ? 'link' : 'links'}`}
              className="lift flex flex-col overflow-hidden rounded-[20px] border-2 border-border bg-card"
            >
              <span
                className={cn(
                  'relative flex h-31 items-end border-b-2 border-border px-4.5 pb-4',
                  COLLECTION_BG[c.color],
                )}
              >
                {inside.length ? (
                  inside.slice(0, 3).map((l, i) => {
                    const Icon = LINK_TYPE_DISPLAY[l.type].icon
                    return (
                      <span
                        key={l.id}
                        aria-hidden
                        className={cn(
                          '-mr-3 flex size-13 shrink-0 items-center justify-center rounded-xl border-2 border-sticker-ink bg-white text-sticker-ink shadow-[2px_2px_0_var(--color-sticker-ink)]',
                          TILT[i],
                        )}
                      >
                        <Icon className="size-5.5" strokeWidth={2} />
                      </span>
                    )
                  })
                ) : (
                  <span className="rounded-xl border-2 border-dashed border-sticker-ink px-3 py-2 text-[13px] font-bold text-sticker-ink">
                    Empty — add links
                  </span>
                )}
                <span className="absolute top-3 right-3 flex gap-1.5">
                  {c.pinned && (
                    <span className="rounded-full border-2 border-sticker-ink bg-white px-2 py-0.5 text-xs font-bold text-sticker-ink">
                      ★ Pinned
                    </span>
                  )}
                  <span className="rounded-full border-2 border-sticker-ink bg-sticker-ink px-2 py-0.5 text-xs font-bold text-white">
                    {c.aiCreated ? '✦ AI-made' : 'Yours'}
                  </span>
                </span>
              </span>
              <span className="flex flex-col gap-1 px-4 pt-3.5 pb-4">
                <span className="flex items-baseline justify-between gap-2.5">
                  <strong className="truncate font-display text-[17px] tracking-tight">
                    {c.name}
                  </strong>
                  <span className="shrink-0 text-[13px] font-bold text-muted-foreground">
                    {inside.length}
                  </span>
                </span>
                {c.description && (
                  <span className="line-clamp-2 text-sm text-muted-foreground">
                    {c.description}
                  </span>
                )}
                <span className="mt-1 text-xs text-muted-foreground">
                  Updated {timeAgo(updated, now).toLowerCase()}
                </span>
              </span>
            </Link>
          ))}
          <button
            type="button"
            onClick={() => setCreating(true)}
            className="flex min-h-62.5 flex-col items-center justify-center gap-2.5 rounded-[20px] border-2 border-dashed border-line text-sm text-muted-foreground hover:bg-muted"
          >
            <span
              aria-hidden
              className="flex size-12 items-center justify-center rounded-2xl border-2 border-border bg-card text-foreground"
            >
              <PlusIcon className="size-5.5" strokeWidth={2.6} />
            </span>
            <strong className="text-base text-foreground">New collection</strong>
            <span>Or let the AI group links for you</span>
          </button>
        </div>
      )}

      <CollectionDialog
        open={creating}
        onOpenChange={setCreating}
        onSaved={(id) => router.push(`/app/collections/${id}`)}
      />
    </div>
  )
}
