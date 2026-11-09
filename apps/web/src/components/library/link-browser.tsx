'use client'

import { LINK_TYPES, type LinkType, type SyncLink } from '@keepmint/core'
import { useQuery } from '@tanstack/react-query'
import { CheckSquareIcon, FileCheckIcon, LayoutGridIcon, ListIcon, SearchIcon } from 'lucide-react'
import { type ReactNode, useState } from 'react'
import { Button } from '@/components/ui/button'
import { searchLinks } from '@/lib/api'
import { useIsPhone } from '@/lib/use-media'
import { useStoredValue } from '@/lib/use-stored-value'
import { cn } from '@/lib/utils'
import { useLibraryActions } from './library-actions'
import { LinkCard, LinkRow } from './link-card'
import { LINK_TYPE_DISPLAY, linkTitle } from './link-display'
import { LinkDrawer } from './link-drawer'
import { useLibrary, useLibraryKey } from './use-library'

type Sort = 'newest' | 'oldest' | 'az'
type View = 'grid' | 'list'
const VIEW_KEY = 'keepmint.libraryView'

/** Grid or list, remembered per device; phones default to the list. */
function useView(): [View, (v: View) => void] {
  const isPhone = useIsPhone()
  const [saved, setSaved] = useStoredValue(VIEW_KEY)
  const chosen = saved === 'grid' || saved === 'list' ? saved : null
  return [chosen ?? (isPhone ? 'list' : 'grid'), setSaved]
}

const selectClass = 'h-10 rounded-xl border-2 border-border bg-card pr-8 pl-3 text-sm font-bold'

function Toggle({
  pressed,
  onClick,
  children,
}: {
  pressed: boolean
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onClick}
      className={cn(
        'flex h-10 items-center gap-1.5 rounded-xl border-2 border-border px-3 text-sm font-bold',
        pressed ? 'bg-foreground text-background' : 'bg-card hover:bg-muted',
      )}
    >
      {children}
    </button>
  )
}

/**
 * The link list used by All links and inside a collection: type chips, collection / sort /
 * page-copy / unread filters, full-text search results, select mode with bulk actions,
 * grid or list, and the details drawer.
 */
export function LinkBrowser({
  scope,
  fixedCollectionId,
  query = '',
  initialOpenId = null,
  header,
  emptyLibrary,
}: {
  /** The links this screen shows (e.g. one collection's). */
  scope: SyncLink[]
  fixedCollectionId?: string
  /** Full-text search (All links' `?q=`). */
  query?: string
  /** Open this link's details straight away (from a search result). */
  initialOpenId?: string | null
  header: (controls: ReactNode) => ReactNode
  /** Shown instead of the browser when `scope` is empty. */
  emptyLibrary: ReactNode
}) {
  const { collections } = useLibrary()
  const actions = useLibraryActions()
  const key = useLibraryKey()
  const [view, setView] = useView()
  const [type, setType] = useState<LinkType | 'all'>('all')
  const [collectionFilter, setCollectionFilter] = useState<string>('all')
  const [sort, setSort] = useState<Sort>('newest')
  const [copyOnly, setCopyOnly] = useState(false)
  const [unreadOnly, setUnreadOnly] = useState(false)
  const [selectMode, setSelectMode] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [openId, setOpenId] = useState<string | null>(initialOpenId)
  // A new search result opens its link even if this screen is already showing.
  const [lastInitialOpenId, setLastInitialOpenId] = useState(initialOpenId)
  if (initialOpenId !== lastInitialOpenId) {
    setLastInitialOpenId(initialOpenId)
    setOpenId(initialOpenId)
  }

  const q = query.trim()
  const search = useQuery({
    queryKey: ['search', key[1], q],
    queryFn: () => searchLinks(q),
    enabled: q.length > 0,
    staleTime: 10_000,
  })

  const collectionName = (l: SyncLink) =>
    l.collectionId ? (collections[l.collectionId]?.name ?? 'Unsorted') : 'Unsorted'

  // Everything except the type chip, so each chip can show its own count.
  let filtered = scope
  if (q) {
    const rank = new Map((search.data ?? []).map((id, i) => [id, i]))
    filtered = filtered.filter((l) => rank.has(l.id))
    if (sort === 'newest')
      filtered = [...filtered].sort((a, b) => (rank.get(a.id) ?? 0) - (rank.get(b.id) ?? 0))
  }
  if (!fixedCollectionId && collectionFilter !== 'all') {
    filtered = filtered.filter((l) =>
      collectionFilter === 'unsorted' ? !l.collectionId : l.collectionId === collectionFilter,
    )
  }
  if (copyOnly) filtered = filtered.filter((l) => l.hasPageCopy)
  if (unreadOnly) filtered = filtered.filter((l) => l.readState !== 'done')
  if (!q || sort !== 'newest') {
    filtered = [...filtered].sort((a, b) =>
      sort === 'az'
        ? linkTitle(a).localeCompare(linkTitle(b))
        : sort === 'oldest'
          ? a.savedAt.localeCompare(b.savedAt)
          : b.savedAt.localeCompare(a.savedAt),
    )
  }

  const visible = type === 'all' ? filtered : filtered.filter((l) => l.type === type)
  const typeCounts = new Map<LinkType, number>()
  for (const l of filtered) typeCounts.set(l.type, (typeCounts.get(l.type) ?? 0) + 1)

  const anyFilter =
    type !== 'all' || collectionFilter !== 'all' || copyOnly || unreadOnly || sort !== 'newest'
  const clearFilters = () => {
    setType('all')
    setCollectionFilter('all')
    setCopyOnly(false)
    setUnreadOnly(false)
    setSort('newest')
  }

  const toggleSelect = (id: string) =>
    setSelected((s) => {
      const next = new Set(s)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  const endSelect = () => {
    setSelectMode(false)
    setSelected(new Set())
  }
  const selectedIds = [...selected].filter((id) => visible.some((l) => l.id === id))
  const allSelected = selectedIds.length > 0 && selectedIds.length === visible.length
  const sortedCollections = Object.values(collections).sort((a, b) => a.name.localeCompare(b.name))
  const open = (id: string) => (selectMode ? toggleSelect(id) : setOpenId(id))

  if (scope.length === 0 && !q)
    return (
      <>
        {header(null)}
        {emptyLibrary}
      </>
    )

  const controls = (
    <div className="flex items-center gap-2">
      <Button
        variant={selectMode ? 'default' : 'outline'}
        aria-pressed={selectMode}
        onClick={() => (selectMode ? endSelect() : setSelectMode(true))}
      >
        <CheckSquareIcon aria-hidden />
        {selectMode ? 'Done' : 'Select'}
      </Button>
      <fieldset
        aria-label="View"
        className="flex min-w-0 gap-0.75 rounded-xl border-2 border-border bg-card p-0.75"
      >
        {(
          [
            ['grid', 'Grid view', LayoutGridIcon],
            ['list', 'List view', ListIcon],
          ] as const
        ).map(([v, label, Icon]) => (
          <button
            key={v}
            type="button"
            aria-label={label}
            aria-pressed={view === v}
            onClick={() => setView(v)}
            className={cn(
              'flex h-8 w-9.5 items-center justify-center rounded-lg',
              view === v ? 'bg-foreground text-background' : 'hover:bg-muted',
            )}
          >
            <Icon aria-hidden className="size-4" strokeWidth={2.4} />
          </button>
        ))}
      </fieldset>
    </div>
  )

  return (
    <div className="flex flex-col gap-5">
      {header(controls)}

      <div className="flex flex-col gap-3">
        <fieldset aria-label="Filter by type" className="flex min-w-0 gap-2 overflow-x-auto pb-1.5">
          {(['all', ...LINK_TYPES] as const)
            .filter((t) => t === 'all' || typeCounts.has(t))
            .map((t) => (
              <button
                key={t}
                type="button"
                aria-pressed={type === t}
                onClick={() => setType(t)}
                className={cn(
                  'flex h-9.5 shrink-0 items-center gap-2 rounded-full border-2 border-border pr-2.5 pl-3.5 text-sm font-bold',
                  type === t ? 'bg-foreground text-background' : 'bg-card hover:bg-muted',
                )}
              >
                {t === 'all' ? 'All' : `${LINK_TYPE_DISPLAY[t].label}s`}
                <span
                  className={cn(
                    'min-w-5.5 rounded-full px-1.5 text-center text-xs',
                    type === t ? 'bg-background/20' : 'bg-muted',
                  )}
                >
                  {t === 'all' ? filtered.length : typeCounts.get(t)}
                </span>
              </button>
            ))}
        </fieldset>
        <div className="flex flex-wrap items-center gap-2.5">
          {!fixedCollectionId && (
            <>
              <label htmlFor="lib-col" className="sr-only">
                Collection
              </label>
              <select
                id="lib-col"
                value={collectionFilter}
                onChange={(e) => setCollectionFilter(e.target.value)}
                className={selectClass}
              >
                <option value="all">All collections</option>
                <option value="unsorted">Unsorted</option>
                {sortedCollections.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </>
          )}
          <label htmlFor="lib-sort" className="sr-only">
            Sort
          </label>
          <select
            id="lib-sort"
            value={sort}
            onChange={(e) => setSort(e.target.value as Sort)}
            className={selectClass}
          >
            <option value="newest">{q ? 'Best match' : 'Newest first'}</option>
            <option value="oldest">Oldest first</option>
            <option value="az">A–Z</option>
          </select>
          <Toggle pressed={copyOnly} onClick={() => setCopyOnly((v) => !v)}>
            <FileCheckIcon aria-hidden className="size-4" strokeWidth={2.4} />
            Page saved
          </Toggle>
          <Toggle pressed={unreadOnly} onClick={() => setUnreadOnly((v) => !v)}>
            <span
              aria-hidden
              className="size-2 rounded-full border-[1.5px] border-sticker-ink bg-primary"
            />
            Unread
          </Toggle>
          <span className="min-w-0 flex-1" />
          <span aria-live="polite" className="text-sm font-semibold text-muted-foreground">
            {q && search.isPending
              ? 'Searching…'
              : q && search.isError
                ? 'Search failed'
                : `${visible.length} ${visible.length === 1 ? 'link' : 'links'}`}
          </span>
          {anyFilter && (
            <Button variant="link" onClick={clearFilters}>
              Clear filters
            </Button>
          )}
        </div>
      </div>

      {selectMode && (
        <div
          role="toolbar"
          aria-label="Bulk actions"
          className="sticky top-20 z-5 flex flex-wrap items-center gap-2 rounded-2xl border-2 border-border bg-sticker-ink px-3 py-2.5 text-white shadow-[4px_4px_0_var(--color-violet)]"
        >
          <strong className="flex-1 pl-1">
            {selectedIds.length ? `${selectedIds.length} selected` : 'Tap links to select'}
          </strong>
          <button
            type="button"
            onClick={() => setSelected(allSelected ? new Set() : new Set(visible.map((l) => l.id)))}
            className="h-9 rounded-[10px] border-2 border-white px-3 text-[13px] font-bold"
          >
            {allSelected ? 'Select none' : 'Select all'}
          </button>
          <label htmlFor="lib-move" className="sr-only">
            Move selected to collection
          </label>
          <select
            id="lib-move"
            value=""
            disabled={!selectedIds.length}
            onChange={(e) => {
              const target = e.target.value
              if (!target) return
              void actions.updateLinks(selectedIds, {
                collectionId: target === 'unsorted' ? null : target,
              })
              endSelect()
            }}
            className="h-9 rounded-[10px] border-2 border-white bg-sticker-ink px-3 text-[13px] font-bold disabled:opacity-50"
          >
            <option value="">Move to…</option>
            <option value="unsorted">Unsorted</option>
            {sortedCollections.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <button
            type="button"
            disabled={!selectedIds.length}
            onClick={() => {
              void actions.setDone(selectedIds, true)
              endSelect()
            }}
            className="h-9 rounded-[10px] border-2 border-white px-3 text-[13px] font-bold disabled:opacity-50"
          >
            Mark read
          </button>
          <button
            type="button"
            disabled={!selectedIds.length}
            onClick={() => {
              void actions.deleteLinks(selectedIds)
              endSelect()
            }}
            className="h-9 rounded-[10px] border-2 border-white bg-pink px-3 text-[13px] font-bold text-sticker-ink disabled:opacity-50"
          >
            Delete
          </button>
        </div>
      )}

      {q && search.isPending ? (
        <div aria-busy="true" className="flex flex-col gap-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-17 animate-pulse rounded-[18px] bg-muted" />
          ))}
        </div>
      ) : q && search.isError ? (
        <div className="flex flex-col items-center gap-3 rounded-[18px] border-2 border-dashed border-line px-5 py-10 text-center">
          <strong className="font-display text-lg">Search didn’t work</strong>
          <span className="max-w-95 text-muted-foreground">
            We couldn’t search your links just now. Your links are safe.
          </span>
          <Button onClick={() => void search.refetch()}>Try again</Button>
        </div>
      ) : visible.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-[18px] border-2 border-dashed border-line px-5 py-10 text-center">
          <span
            aria-hidden
            className="flex size-14 items-center justify-center rounded-2xl border-2 border-border bg-yellow text-sticker-ink"
          >
            <SearchIcon className="size-6" strokeWidth={2.4} />
          </span>
          <strong className="font-display text-lg">No links match</strong>
          <span className="max-w-95 text-muted-foreground">
            {q
              ? `Nothing matches “${q}”${anyFilter ? ' with these filters' : ''}. Try other words.`
              : 'Nothing matches these filters.'}
          </span>
          {anyFilter && <Button onClick={clearFilters}>Clear filters</Button>}
        </div>
      ) : view === 'grid' ? (
        <div className="grid grid-cols-1 gap-4.5 tablet:grid-cols-2 desktop:grid-cols-3">
          {visible.map((l) => (
            <LinkCard
              key={l.id}
              link={l}
              collectionName={collectionName(l)}
              selectMode={selectMode}
              selected={selected.has(l.id)}
              onOpen={() => open(l.id)}
            />
          ))}
        </div>
      ) : (
        <div className="overflow-hidden rounded-[18px] border-2 border-border bg-card">
          {visible.map((l) => (
            <LinkRow
              key={l.id}
              link={l}
              collectionName={collectionName(l)}
              showCollection={!fixedCollectionId}
              selectMode={selectMode}
              selected={selected.has(l.id)}
              onOpen={() => open(l.id)}
            />
          ))}
        </div>
      )}

      <LinkDrawer linkId={openId} onClose={() => setOpenId(null)} />
    </div>
  )
}
