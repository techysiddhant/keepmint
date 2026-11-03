'use client'

import {
  type AiUsage,
  isLinkBusy,
  isLinkStuck,
  type SyncCollection,
  type SyncLink,
  type SyncResult,
} from '@keepmint/core'
import { type QueryClient, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createContext,
  createElement,
  type ReactNode,
  useCallback,
  useContext,
  useMemo,
} from 'react'
import { toast } from 'sonner'
import { pullChanges, pushChanges } from '@/lib/api'

/** Rows newer than the cursor can commit slightly out of order; re-read a few. */
const PULL_OVERLAP = 50
const POLL_MS = 15_000
/** Right after a save, poll faster so the summary shows up within seconds. */
const FAST_POLL_MS = 3_000
const FAST_POLL_FOR_MS = 60_000

/**
 * One cache entry per user. The query client outlives sign-out (it lives in the root
 * providers), so a key without the user would hand the next account in this tab the
 * previous one's links and sync cursor.
 */
export const libraryQueryKey = (userId: string) => ['library', userId] as const
type LibraryKey = ReturnType<typeof libraryQueryKey>

const LibraryUserContext = createContext<string | null>(null)

/** Tells useLibrary whose library it is (set once in the app layout). */
export function LibraryUserProvider({ userId, children }: { userId: string; children: ReactNode }) {
  return createElement(LibraryUserContext.Provider, { value: userId }, children)
}

/**
 * The signed-in user's library as one cached object, built up by incremental pulls from
 * /api/sync. Phase 4 moves it into IndexedDB (Dexie) with an outbox; the API stays the same.
 */
type LibraryData = {
  links: Record<string, SyncLink>
  collections: Record<string, SyncCollection>
  usage: AiUsage | null
  /** Highest server_version seen; the next pull asks for anything newer. */
  cursor: number
  /** Last save or retry on this device: drives the faster polling. */
  lastLocalChangeAt: number
}

const EMPTY: LibraryData = {
  links: {},
  collections: {},
  usage: null,
  cursor: 0,
  lastLocalChangeAt: 0,
}

/** A saved link's id, and whether it was already in the library. */
export type AddLinkResult = { id: string; duplicate: boolean }

function updateLibrary(qc: QueryClient, key: LibraryKey, fn: (data: LibraryData) => LibraryData) {
  qc.setQueryData<LibraryData>(key, (data) => fn(data ?? EMPTY))
}

function dropLink(qc: QueryClient, key: LibraryKey, id: string) {
  updateLibrary(qc, key, (d) => {
    const links = { ...d.links }
    delete links[id]
    return { ...d, links }
  })
}

/** Pulls every page of changes since the cursor and merges them into the cache. */
async function pullLibrary(qc: QueryClient, key: LibraryKey): Promise<LibraryData> {
  const start = qc.getQueryData<LibraryData>(key) ?? EMPTY
  let cursor = start.cursor
  let usage = start.usage
  const links: SyncLink[] = []
  const collections: SyncCollection[] = []
  let more = true
  while (more) {
    const since = Math.max(0, cursor - PULL_OVERLAP)
    const page = await pullChanges(since)
    const previous = cursor
    cursor = Math.max(previous, page.cursor)
    // Only page on while the cursor actually moves forward, so a bad page can't loop.
    more = page.hasMore && page.cursor > previous
    links.push(...page.links)
    collections.push(...page.collections)
    usage = page.usage
  }

  // Merge into the cache as it is *now*, so a save made during the pull isn't lost.
  const latest = qc.getQueryData<LibraryData>(key) ?? start
  const nextLinks = { ...latest.links }
  for (const l of links) {
    if (l.deletedAt) delete nextLinks[l.id]
    else nextLinks[l.id] = l
  }
  const nextCollections = { ...latest.collections }
  for (const c of collections) {
    if (c.deletedAt) delete nextCollections[c.id]
    else nextCollections[c.id] = c
  }
  return {
    ...latest,
    links: nextLinks,
    collections: nextCollections,
    usage,
    cursor: Math.max(latest.cursor, cursor),
  }
}

/** Poll only while the worker still has links to read (stuck ones won't change on their own). */
function pollInterval(data: LibraryData | undefined): number | false {
  const busy = Object.values(data?.links ?? {}).some((l) => isLinkBusy(l) && !isLinkStuck(l))
  if (!data || !busy) return false
  return Date.now() - data.lastLocalChangeAt < FAST_POLL_FOR_MS ? FAST_POLL_MS : POLL_MS
}

function optimisticLink(v: { id: string; url: string; readLater: boolean; savedAt: string }) {
  let host = v.url
  try {
    host = new URL(/^https?:\/\//i.test(v.url) ? v.url : `https://${v.url}`).hostname
  } catch {}
  // Shown straight away as "reading…"; the next pull replaces it with the server row.
  return {
    id: v.id,
    url: v.url,
    site: host.replace(/^www\./, ''),
    title: null,
    description: null,
    imageUrl: null,
    type: 'article',
    summary: null,
    tags: [],
    collectionId: null,
    note: null,
    status: 'queued',
    aiSkipReason: null,
    aiSuggestedCollection: null,
    readLater: v.readLater,
    readMinutes: null,
    failReason: null,
    savedAt: v.savedAt,
    processedAt: null,
    updatedAt: v.savedAt,
    serverVersion: 0,
    deletedAt: null,
  } satisfies SyncLink
}

/**
 * The library plus its actions. Every component reading it shares one cached query:
 * TanStack Query handles polling, refetching on focus/reconnect, and retrying failed pulls.
 */
export function useLibrary() {
  const userId = useContext(LibraryUserContext)
  if (!userId) throw new Error('useLibrary must be used inside <LibraryUserProvider>')
  const key = useMemo(() => libraryQueryKey(userId), [userId])
  const qc = useQueryClient()
  const query = useQuery({
    queryKey: key,
    queryFn: () => pullLibrary(qc, key),
    refetchInterval: (q) => pollInterval(q.state.data),
  })
  const refresh = useCallback(() => qc.invalidateQueries({ queryKey: key }), [qc, key])

  const create = useMutation({
    mutationFn: async (v: { id: string; url: string; readLater: boolean; savedAt: string }) => {
      const [result] = await pushChanges([{ kind: 'link.create', ...v }])
      return result as SyncResult
    },
    onMutate: async (v) => {
      // Don't let an in-flight pull overwrite the optimistic row.
      await qc.cancelQueries({ queryKey: key })
      updateLibrary(qc, key, (d) => ({
        ...d,
        links: { ...d.links, [v.id]: optimisticLink(v) },
        lastLocalChangeAt: Date.now(),
      }))
    },
    onError: (_err, v) => {
      dropLink(qc, key, v.id)
      toast.error('Couldn’t save — check your connection and try again.')
    },
    onSettled: () => refresh(),
  })

  const retry = useMutation({
    mutationFn: async (id: string) => {
      const [result] = await pushChanges([{ kind: 'link.retry', id }])
      // Refused (e.g. no longer failed): treat as a failure so onError restores the link.
      if (!result?.ok) throw new Error(`retry refused: ${result?.error ?? 'no result'}`)
    },
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: key })
      const previous = qc.getQueryData<LibraryData>(key)?.links[id]
      const now = new Date().toISOString()
      updateLibrary(qc, key, (d) => {
        const link = d.links[id]
        if (!link) return d
        return {
          ...d,
          links: {
            ...d.links,
            [id]: { ...link, status: 'queued', failReason: null, updatedAt: now },
          },
          lastLocalChangeAt: Date.now(),
        }
      })
      return { previous }
    },
    onError: (_err, id, context) => {
      const previous = context?.previous
      if (previous) updateLibrary(qc, key, (d) => ({ ...d, links: { ...d.links, [id]: previous } }))
      toast.error('Couldn’t retry that link. Try again in a moment.')
    },
    onSettled: () => refresh(),
  })

  const { mutateAsync: createAsync } = create
  /** Saves a link (shows its own toasts for errors and duplicates); null if refused. */
  const addLink = useCallback(
    async (url: string, { readLater = false } = {}): Promise<AddLinkResult | null> => {
      const vars = { id: crypto.randomUUID(), url, readLater, savedAt: new Date().toISOString() }
      let result: SyncResult
      try {
        result = await createAsync(vars)
      } catch {
        return null // onError already rolled back and told the user
      }
      if (!result?.ok) {
        dropLink(qc, key, vars.id)
        toast.error(
          result?.error === 'invalid_url'
            ? 'That doesn’t look like a link Keepmint can save.'
            : 'Couldn’t save that link.',
        )
        return null
      }
      if (result.duplicateOf) {
        dropLink(qc, key, vars.id)
        toast('Already in your library')
        return { id: result.duplicateOf, duplicate: true }
      }
      return { id: vars.id, duplicate: false }
    },
    [createAsync, qc, key],
  )

  const { mutateAsync: retryAsync } = retry
  const retryLink = useCallback(
    async (id: string) => {
      await retryAsync(id).catch(() => {})
    },
    [retryAsync],
  )

  const data = query.data ?? EMPTY
  return {
    links: data.links,
    collections: data.collections,
    usage: data.usage,
    /** The first pull has finished (even if it failed). */
    loaded: !query.isPending,
    /** The last pull failed; what's shown may be incomplete. */
    loadError: query.isError,
    addLink,
    retryLink,
    refresh,
  }
}
