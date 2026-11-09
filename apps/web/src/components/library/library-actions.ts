'use client'

import {
  type CollectionColor,
  SYNC_PULL_LIMIT,
  SYNC_PUSH_LIMIT,
  type SyncChange,
  type SyncCollection,
  type SyncLink,
  type SyncResult,
  type SyncSuggestion,
} from '@keepmint/core'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { pushChanges } from '@/lib/api'
import { type LibraryData, updateLibrary, useLibraryKey } from './use-library'

/** A push whose server results include a refusal. */
class SyncRefused extends Error {
  constructor(readonly result: Extract<SyncResult, { ok: false }>) {
    super(result.error)
  }
}

const REFUSED_MESSAGE: Record<string, string> = {
  name_taken: 'You already have a collection with that name.',
  already_saved: 'That link is already back in your library.',
  not_found: 'That item no longer exists. Refreshing…',
}

type Action = {
  changes: SyncChange[]
  /** The optimistic change to the cache; rolled back if the push fails or is refused. */
  apply?: (data: LibraryData) => LibraryData
  errorMessage: string
}

/** The link fields the device may change (as the sync API accepts them). */
export type LinkPatch = Extract<SyncChange, { kind: 'link.update' }>['patch']

export type NewCollection = {
  name: string
  color: CollectionColor
  description: string | null
  aiFill: boolean
}

/** Long enough to notice and reach for Undo (Sonner's default is 4 s). */
const UNDO_MS = 8000

const now = () => new Date().toISOString()

/** [1,2,3,4,5] by 2 → [[1,2],[3,4],[5]]; always at least one (possibly empty) chunk. */
function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size))
  return out.length ? out : [[]]
}

function patchLinks(d: LibraryData, ids: string[], fn: (l: SyncLink) => SyncLink): LibraryData {
  const links = { ...d.links }
  for (const id of ids) {
    const link = links[id]
    if (link) links[id] = fn(link)
  }
  return { ...d, links, lastLocalChangeAt: Date.now() }
}

/** What the server will do to a link for a patch, applied to the cached copy. */
function applyPatch(link: SyncLink, patch: LinkPatch): SyncLink {
  const next = { ...link, ...patch }
  if (patch.readLater !== undefined) {
    next.readLaterRank = patch.readLater ? (patch.readLaterRank ?? Date.now()) : null
  }
  if (patch.readState !== undefined) {
    next.finishedAt = patch.readState === 'done' ? (link.finishedAt ?? now()) : null
  }
  // Filing a link by hand answers its AI review (the server does the same).
  if (patch.collectionId !== undefined && link.status === 'needs_review') next.status = 'done'
  return next
}

function optimisticCollection(id: string, c: Omit<NewCollection, 'aiFill'>): SyncCollection {
  const at = now()
  return {
    id,
    name: c.name,
    color: c.color,
    description: c.description,
    pinned: false,
    aiCreated: false,
    createdAt: at,
    updatedAt: at,
    serverVersion: 0,
    deletedAt: null,
  }
}

/**
 * Everything the library screens can change. Each action updates the cache at once
 * (optimistic), pushes to /api/sync, and rolls back with a toast if that fails or the
 * server refuses it; a pull afterwards brings in the server's version.
 */
export function useLibraryActions() {
  const qc = useQueryClient()
  const key = useLibraryKey()

  const { mutateAsync } = useMutation({
    mutationFn: async ({ changes }: Action) => {
      // A bulk action can be larger than one push may carry; send it in turn, in order.
      for (const batch of chunk(changes, SYNC_PUSH_LIMIT)) {
        const results = await pushChanges(batch)
        const refused = results.find((r): r is Extract<SyncResult, { ok: false }> => !r.ok)
        if (refused) throw new SyncRefused(refused)
      }
    },
    onMutate: async ({ apply }) => {
      await qc.cancelQueries({ queryKey: key })
      const previous = qc.getQueryData<LibraryData>(key)
      if (apply) updateLibrary(qc, key, apply)
      return { previous }
    },
    onError: (err, { errorMessage }, context) => {
      if (context?.previous) qc.setQueryData(key, context.previous)
      toast.error(
        err instanceof SyncRefused
          ? (REFUSED_MESSAGE[err.result.error] ?? errorMessage)
          : errorMessage,
      )
    },
    onSettled: () => qc.invalidateQueries({ queryKey: key }),
  })

  /** Resolves true when the server accepted every change. */
  const run = (action: Action) =>
    mutateAsync(action).then(
      () => true,
      () => false,
    )

  const read = () => qc.getQueryData<LibraryData>(key)

  const updateLinks = (
    ids: string[],
    patch: LinkPatch,
    errorMessage = 'Couldn’t save that change.',
  ) =>
    run({
      changes: ids.map((id) => ({ kind: 'link.update', id, patch })),
      apply: (d) => patchLinks(d, ids, (l) => applyPatch(l, patch)),
      errorMessage,
    })

  const restoreLinks = (saved: SyncLink[]) =>
    run({
      changes: saved.map((l) => ({ kind: 'link.restore', id: l.id })),
      apply: (d) => ({
        ...d,
        links: { ...d.links, ...Object.fromEntries(saved.map((l) => [l.id, l])) },
      }),
      errorMessage: 'Couldn’t restore that.',
    })

  const deleteLinks = async (ids: string[]) => {
    const saved = ids.flatMap((id) => read()?.links[id] ?? [])
    const ok = await run({
      changes: ids.map((id) => ({ kind: 'link.delete', id })),
      apply: (d) => {
        const links = { ...d.links }
        for (const id of ids) delete links[id]
        return { ...d, links }
      },
      errorMessage: 'Couldn’t delete that.',
    })
    if (ok) {
      toast(ids.length === 1 ? 'Link deleted' : `${ids.length} links deleted`, {
        duration: UNDO_MS,
        action: { label: 'Undo', onClick: () => void restoreLinks(saved) },
      })
    }
    return ok
  }

  const createCollection = async (c: NewCollection) => {
    const id = crypto.randomUUID()
    const ok = await run({
      changes: [{ kind: 'collection.create', id, ...c }],
      apply: (d) => ({
        ...d,
        collections: { ...d.collections, [id]: optimisticCollection(id, c) },
        // "Let AI fill it" moves links in a few seconds later: watch for it.
        expectChangesUntil: c.aiFill ? Date.now() + 30_000 : d.expectChangesUntil,
      }),
      errorMessage: 'Couldn’t create that collection.',
    })
    return ok ? id : null
  }

  const updateCollection = (
    id: string,
    patch: Partial<Pick<SyncCollection, 'name' | 'color' | 'pinned' | 'description'>>,
  ) =>
    run({
      changes: [{ kind: 'collection.update', id, patch }],
      apply: (d) => {
        const c = d.collections[id]
        return c ? { ...d, collections: { ...d.collections, [id]: { ...c, ...patch } } } : d
      },
      errorMessage: 'Couldn’t save that change.',
    })

  const restoreCollection = (collection: SyncCollection, linkIds: string[]) =>
    run({
      // One restore per 500 links (the most one change may carry); the server accepts
      // repeats of the same restore, so a big collection comes back in one push.
      changes: chunk(linkIds, SYNC_PULL_LIMIT).map((ids) => ({
        kind: 'collection.restore',
        id: collection.id,
        linkIds: ids,
      })),
      apply: (d) =>
        patchLinks(
          { ...d, collections: { ...d.collections, [collection.id]: collection } },
          linkIds,
          (l) => (l.collectionId ? l : { ...l, collectionId: collection.id }),
        ),
      errorMessage: 'Couldn’t restore that collection.',
    })

  const deleteCollection = async (id: string) => {
    const data = read()
    const collection = data?.collections[id]
    if (!collection) return false
    const linkIds = Object.values(data.links)
      .filter((l) => l.collectionId === id)
      .map((l) => l.id)
    const ok = await run({
      changes: [{ kind: 'collection.delete', id }],
      apply: (d) => {
        const collections = { ...d.collections }
        delete collections[id]
        return patchLinks({ ...d, collections }, linkIds, (l) => ({ ...l, collectionId: null }))
      },
      errorMessage: 'Couldn’t delete that collection.',
    })
    if (ok) {
      toast(`Deleted “${collection.name}”`, {
        description: linkIds.length ? 'Its links moved to Unsorted.' : undefined,
        duration: UNDO_MS,
        action: { label: 'Undo', onClick: () => void restoreCollection(collection, linkIds) },
      })
    }
    return ok
  }

  /** AI review: file the link where the user chose (a new collection is created first). */
  const reviewLink = (
    linkId: string,
    choice: { collectionId: string | null } | { newName: string; color: CollectionColor },
  ) => {
    const created =
      'newName' in choice
        ? optimisticCollection(crypto.randomUUID(), {
            name: choice.newName,
            color: choice.color,
            description: null,
          })
        : null
    const collectionId = created
      ? created.id
      : 'collectionId' in choice
        ? choice.collectionId
        : null
    const changes: SyncChange[] = created
      ? [{ kind: 'collection.create', id: created.id, name: created.name, color: created.color }]
      : []
    changes.push({ kind: 'link.review', id: linkId, collectionId })
    return run({
      changes,
      apply: (d) =>
        patchLinks(
          created ? { ...d, collections: { ...d.collections, [created.id]: created } } : d,
          [linkId],
          (l) => ({ ...l, collectionId, status: 'done' }),
        ),
      errorMessage: 'Couldn’t file that link.',
    })
  }

  const acceptSuggestion = (s: SyncSuggestion, color: CollectionColor) => {
    // A collection with this name may exist already: the server fills that one instead.
    const existing = Object.values(read()?.collections ?? {}).find(
      (c) => c.name.toLowerCase() === s.name.toLowerCase(),
    )
    const collection =
      existing ??
      optimisticCollection(crypto.randomUUID(), { name: s.name, color, description: null })
    return run({
      changes: [{ kind: 'suggestion.accept', id: s.id, collectionId: collection.id, color }],
      apply: (d) =>
        patchLinks(
          {
            ...d,
            collections: existing
              ? d.collections
              : { ...d.collections, [collection.id]: { ...collection, aiCreated: true } },
            suggestions: d.suggestions.filter((x) => x.id !== s.id),
          },
          s.linkIds,
          (l) =>
            l.collectionId
              ? l
              : {
                  ...l,
                  collectionId: collection.id,
                  status: l.status === 'needs_review' ? 'done' : l.status,
                },
        ),
      errorMessage: 'Couldn’t create that collection.',
    })
  }

  const dismissSuggestion = (id: string) =>
    run({
      changes: [{ kind: 'suggestion.dismiss', id }],
      apply: (d) => ({ ...d, suggestions: d.suggestions.filter((x) => x.id !== id) }),
      errorMessage: 'Couldn’t dismiss that.',
    })

  /** Read later "Move to top": a rank below everything else in the queue. */
  const moveToTop = (id: string) => {
    const ranks = Object.values(read()?.links ?? {}).flatMap((l) =>
      l.readLater && l.readLaterRank !== null ? [l.readLaterRank] : [],
    )
    const top = ranks.length ? Math.min(...ranks) - 1 : Date.now()
    return updateLinks([id], { readLaterRank: top }, 'Couldn’t move that.')
  }

  /** Mark as done (or back to unread) with an Undo that restores the previous state. */
  const setDone = async (ids: string[], done: boolean) => {
    const before = ids.flatMap((id) => {
      const l = read()?.links[id]
      return l ? [{ id, readState: l.readState, readProgress: l.readProgress }] : []
    })
    // Back to the queue means starting over: an unread link has no reading progress.
    const ok = await updateLinks(
      ids,
      done ? { readState: 'done' } : { readState: 'unread', readProgress: 0 },
    )
    if (ok && done) {
      toast(ids.length === 1 ? 'Marked as done' : `${ids.length} marked as read`, {
        duration: UNDO_MS,
        action: {
          label: 'Undo',
          onClick: () => {
            for (const b of before) {
              void updateLinks([b.id], { readState: b.readState, readProgress: b.readProgress })
            }
          },
        },
      })
    }
    return ok
  }

  return {
    updateLinks,
    deleteLinks,
    restoreLinks,
    createCollection,
    updateCollection,
    deleteCollection,
    reviewLink,
    acceptSuggestion,
    dismissSuggestion,
    moveToTop,
    setDone,
  }
}
