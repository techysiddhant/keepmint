'use client'

import {
  type AiUsage,
  isLinkBusy,
  isLinkStuck,
  type SyncChange,
  type SyncCollection,
  type SyncLink,
  type SyncPullResponse,
  type SyncResult,
} from '@keepmint/core'
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { toast } from 'sonner'

/** Rows newer than the cursor can commit slightly out of order; re-read a few. */
const PULL_OVERLAP = 50
const POLL_MS = 15_000
/** Right after a save, poll faster so the summary shows up within seconds. */
const FAST_POLL_MS = 3_000
const FAST_POLL_FOR_MS = 60_000

type LibraryState = {
  links: Record<string, SyncLink>
  collections: Record<string, SyncCollection>
  usage: AiUsage | null
  /** The first pull has finished (even if it failed). */
  loaded: boolean
  /** The last pull failed; what's shown may be incomplete. */
  loadError: boolean
}

/** A saved link's id, and whether it was already in the library. */
export type AddLinkResult = { id: string; duplicate: boolean }

type Library = LibraryState & {
  /** Saves a link (its own toasts for errors and duplicates); null if refused. */
  addLink: (url: string, opts?: { readLater?: boolean }) => Promise<AddLinkResult | null>
  retryLink: (id: string) => Promise<void>
  refresh: () => Promise<void>
}

const LibraryContext = createContext<Library | null>(null)

export function useLibrary() {
  const value = useContext(LibraryContext)
  if (!value) throw new Error('useLibrary must be used inside <LibraryProvider>')
  return value
}

async function push(changes: SyncChange[]): Promise<SyncResult[]> {
  const res = await fetch('/api/sync/push', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ changes }),
  })
  if (!res.ok) throw new Error(`push failed: ${res.status}`)
  return ((await res.json()) as { results: SyncResult[] }).results
}

/**
 * The signed-in user's library, kept in memory and synced through /api/sync. Phase 4
 * moves this into IndexedDB (Dexie) with an outbox; the API stays the same.
 */
export function LibraryProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<LibraryState>({
    links: {},
    collections: {},
    usage: null,
    loaded: false,
    loadError: false,
  })
  const cursor = useRef(0)
  const lastSave = useRef(0)
  const pulling = useRef<Promise<void> | null>(null)
  const pullAgain = useRef(false)

  const refresh = useCallback(function pull(): Promise<void> {
    // A pull already running may have started before the change that asked for this one
    // (e.g. a save): let it finish, then pull once more.
    if (pulling.current) {
      pullAgain.current = true
      return pulling.current
    }
    pulling.current = (async () => {
      try {
        let more = true
        while (more) {
          const since = Math.max(0, cursor.current - PULL_OVERLAP)
          const res = await fetch(`/api/sync/pull?since=${since}`, { cache: 'no-store' })
          if (!res.ok) throw new Error(`pull failed: ${res.status}`)
          const data = (await res.json()) as SyncPullResponse
          const previous = cursor.current
          cursor.current = Math.max(previous, data.cursor)
          // Only page on while the cursor actually moves forward, so a bad page can't loop.
          more = data.hasMore && data.cursor > previous
          setState((s) => {
            const links = { ...s.links }
            for (const l of data.links) {
              if (l.deletedAt) delete links[l.id]
              else links[l.id] = l
            }
            const collections = { ...s.collections }
            for (const c of data.collections) {
              if (c.deletedAt) delete collections[c.id]
              else collections[c.id] = c
            }
            return { links, collections, usage: data.usage, loaded: true, loadError: false }
          })
        }
      } catch (err) {
        console.error(err)
        setState((s) => ({ ...s, loaded: true, loadError: true }))
      }
    })().finally(() => {
      pulling.current = null
      if (pullAgain.current) {
        pullAgain.current = false
        void pull()
      }
    })
    return pulling.current
  }, [])

  const addLink = useCallback<Library['addLink']>(
    async (url, { readLater = false } = {}) => {
      const id = crypto.randomUUID()
      const savedAt = new Date().toISOString()
      let host = url
      try {
        host = new URL(/^https?:\/\//i.test(url) ? url : `https://${url}`).hostname
      } catch {}
      // Shown straight away as "reading…"; the next pull replaces it with the server row.
      const optimistic: SyncLink = {
        id,
        url,
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
        readLater,
        readMinutes: null,
        failReason: null,
        savedAt,
        processedAt: null,
        updatedAt: savedAt,
        serverVersion: 0,
        deletedAt: null,
      }
      setState((s) => ({ ...s, links: { ...s.links, [id]: optimistic } }))
      lastSave.current = Date.now()
      const drop = () =>
        setState((s) => {
          const links = { ...s.links }
          delete links[id]
          return { ...s, links }
        })

      try {
        const [result] = await push([{ kind: 'link.create', id, url, readLater, savedAt }])
        if (!result?.ok) {
          drop()
          toast.error(
            result?.error === 'invalid_url'
              ? 'That doesn’t look like a link Keepmint can save.'
              : 'Couldn’t save that link.',
          )
          return null
        }
        if (result.duplicateOf) {
          drop()
          toast('Already in your library')
          void refresh()
          return { id: result.duplicateOf, duplicate: true }
        }
        void refresh()
        return { id, duplicate: false }
      } catch {
        drop()
        toast.error('Couldn’t save — check your connection and try again.')
        return null
      }
    },
    [refresh],
  )

  const retryLink = useCallback<Library['retryLink']>(
    async (id) => {
      setState((s) => {
        const link = s.links[id]
        if (!link) return s
        return {
          ...s,
          links: {
            ...s.links,
            [id]: {
              ...link,
              status: 'queued',
              failReason: null,
              updatedAt: new Date().toISOString(),
            },
          },
        }
      })
      lastSave.current = Date.now()
      try {
        await push([{ kind: 'link.retry', id }])
      } catch {
        toast.error('Couldn’t retry — check your connection.')
      }
      await refresh()
    },
    [refresh],
  )

  // First load, and again whenever the tab comes back into view.
  useEffect(() => {
    void refresh()
    const onFocus = () => document.visibilityState === 'visible' && void refresh()
    document.addEventListener('visibilitychange', onFocus)
    window.addEventListener('online', onFocus)
    return () => {
      document.removeEventListener('visibilitychange', onFocus)
      window.removeEventListener('online', onFocus)
    }
  }, [refresh])

  // Poll only while the worker still has links to read (stuck ones won't change on their own).
  const busy = useMemo(
    () => Object.values(state.links).some((l) => isLinkBusy(l) && !isLinkStuck(l)),
    [state.links],
  )
  useEffect(() => {
    if (!busy) return
    let timer: ReturnType<typeof setTimeout>
    // A pull can still be running at cleanup; this stops it scheduling the next one.
    let cancelled = false
    const tick = () => {
      if (cancelled) return
      const fast = Date.now() - lastSave.current < FAST_POLL_FOR_MS
      timer = setTimeout(
        async () => {
          if (document.visibilityState === 'visible') await refresh()
          tick()
        },
        fast ? FAST_POLL_MS : POLL_MS,
      )
    }
    tick()
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [busy, refresh])

  const value = useMemo(
    () => ({ ...state, addLink, retryLink, refresh }),
    [state, addLink, retryLink, refresh],
  )
  return <LibraryContext.Provider value={value}>{children}</LibraryContext.Provider>
}
