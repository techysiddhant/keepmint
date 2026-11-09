'use client'

import { ArrowLeftIcon, InboxIcon, Trash2Icon } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { EmptyState } from '@/components/library/empty-state'
import { useLibraryActions } from '@/components/library/library-actions'
import { LinkBrowser } from '@/components/library/link-browser'
import { COLLECTION_BG } from '@/components/library/link-display'
import { useLibrary } from '@/components/library/use-library'
import { Button, buttonVariants } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { CollectionDialog } from './collection-dialog'

export function CollectionView({ id }: { id: string }) {
  const { collections, links, loaded } = useLibrary()
  const actions = useLibraryActions()
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const collection = collections[id]
  const scope = Object.values(links).filter((l) => l.collectionId === id)

  if (!loaded) return <div className="h-64 animate-pulse rounded-[20px] bg-muted" />
  if (!collection) {
    return (
      <div className="mx-auto flex max-w-140 flex-col items-start gap-3">
        <h1 className="font-display text-2xl font-bold">This collection is gone</h1>
        <p className="text-muted-foreground">
          It may have been deleted. Its links are in Unsorted.
        </p>
        <Link href="/app/collections" className={buttonVariants()}>
          All collections
        </Link>
      </div>
    )
  }

  const count = `${scope.length} ${scope.length === 1 ? 'link' : 'links'}`

  return (
    <div className="mx-auto flex max-w-290 flex-col gap-6">
      <Link
        href="/app/collections"
        className="flex items-center gap-1.5 self-start rounded-[10px] py-2 pr-2.5 pl-1 font-bold hover:bg-muted"
      >
        <ArrowLeftIcon aria-hidden className="size-4.5" strokeWidth={2.4} />
        All collections
      </Link>

      <div
        className={cn(
          'flex flex-wrap items-end gap-4 rounded-[20px] border-2 border-border p-5 tablet:p-6',
          COLLECTION_BG[collection.color],
        )}
      >
        <div className="flex min-w-[min(320px,100%)] flex-1 flex-col gap-2">
          <span className="flex flex-wrap gap-1.5">
            <span className="rounded-full border-2 border-sticker-ink bg-white px-2 py-0.5 text-xs font-bold text-sticker-ink">
              {collection.aiCreated ? '✦ AI-made' : 'Yours'}
            </span>
            {collection.pinned && (
              <span className="rounded-full border-2 border-sticker-ink bg-white px-2 py-0.5 text-xs font-bold text-sticker-ink">
                ★ Pinned
              </span>
            )}
          </span>
          <h1 className="font-display text-[clamp(26px,4vw,34px)] leading-tight font-extrabold tracking-tight">
            {collection.name}
          </h1>
          {collection.description && <p className="text-[15px]">{collection.description}</p>}
          <span className="text-[13px] font-bold">{count}</span>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            className="bg-white text-sticker-ink"
            aria-pressed={collection.pinned}
            onClick={() => void actions.updateCollection(id, { pinned: !collection.pinned })}
          >
            {collection.pinned ? 'Unpin' : '★ Pin'}
          </Button>
          <Button
            variant="outline"
            className="bg-white text-sticker-ink"
            onClick={() => setEditing(true)}
          >
            Edit
          </Button>
          <Button
            variant="outline"
            className="bg-white text-err-ink"
            onClick={() => setDeleting(true)}
          >
            Delete
          </Button>
        </div>
      </div>

      <LinkBrowser
        scope={scope}
        fixedCollectionId={id}
        header={(controls) => (
          <div className="flex flex-wrap items-end justify-between gap-3.5">
            <h2 className="font-display text-lg font-bold tracking-tight">Links</h2>
            {controls}
          </div>
        )}
        emptyLibrary={
          <EmptyState
            icon={InboxIcon}
            colors={['bg-mint', 'bg-sky']}
            title="Nothing in here yet"
            actions={
              <Link href="/app/links" className={buttonVariants()}>
                Go to All links
              </Link>
            }
          >
            Move links in from All links (Select → Move to…), or wait — Keepmint files new saves
            here when they fit.
          </EmptyState>
        }
      />

      <CollectionDialog open={editing} onOpenChange={setEditing} collection={collection} />

      <Dialog open={deleting} onOpenChange={setDeleting}>
        <DialogContent className="gap-3.5 sm:max-w-110" role="alertdialog">
          <span
            aria-hidden
            className="flex size-12 items-center justify-center rounded-2xl border-2 border-border bg-pink text-sticker-ink"
          >
            <Trash2Icon className="size-5.5" strokeWidth={2.2} />
          </span>
          <DialogTitle>Delete “{collection.name}”?</DialogTitle>
          <DialogDescription className="text-base">
            {scope.length
              ? scope.length === 1
                ? 'Its link won’t be deleted — it’ll move to Unsorted. You can undo this.'
                : `Its ${count} won’t be deleted — they’ll move to Unsorted. You can undo this.`
              : 'It’s empty. You can undo this.'}
          </DialogDescription>
          <DialogFooter>
            <Button variant="outline" size="lg" onClick={() => setDeleting(false)}>
              Cancel
            </Button>
            <Button
              size="lg"
              className="bg-pink text-sticker-ink"
              onClick={async () => {
                setDeleting(false)
                if (await actions.deleteCollection(id)) router.push('/app/collections')
              }}
            >
              Delete collection
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
