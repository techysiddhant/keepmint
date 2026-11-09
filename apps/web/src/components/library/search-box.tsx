'use client'

import { useQuery } from '@tanstack/react-query'
import { SearchIcon, XIcon } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect, useId, useRef, useState } from 'react'
import { searchLinks } from '@/lib/api'
import { cn } from '@/lib/utils'
import { LINK_TYPE_DISPLAY, linkTitle } from './link-display'
import { useLibrary, useLibraryKey } from './use-library'

const isEditable = (el: EventTarget | null) =>
  Boolean(
    (el as HTMLElement | null)?.closest(
      'input, textarea, select, [contenteditable=""], [contenteditable="true"]',
    ),
  )

/** Debounced copy of a value. */
function useDebounced<T>(value: T, ms: number) {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), ms)
    return () => clearTimeout(t)
  }, [value, ms])
  return debounced
}

/**
 * The top-bar search (`/` focuses it). Shows the best matches as you type; Enter (or "See
 * all") opens All links with the full results.
 */
export function SearchBox({ className }: { className?: string }) {
  const router = useRouter()
  const { links, collections } = useLibrary()
  const key = useLibraryKey()
  const inputRef = useRef<HTMLInputElement>(null)
  const listId = useId()
  const [value, setValue] = useState('')
  const [open, setOpen] = useState(false)
  const q = useDebounced(value.trim(), 250)

  const results = useQuery({
    queryKey: ['search', key[1], q],
    queryFn: () => searchLinks(q),
    enabled: q.length > 0,
    staleTime: 10_000,
  })
  const top = (results.data ?? []).flatMap((id) => links[id] ?? []).slice(0, 6)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== '/' || e.metaKey || e.ctrlKey || e.altKey || isEditable(e.target)) return
      if (document.querySelector('[role="dialog"]')) return
      e.preventDefault()
      inputRef.current?.focus()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const go = (path: string) => {
    setOpen(false)
    inputRef.current?.blur()
    router.push(path)
  }
  const seeAll = () => value.trim() && go(`/app/links?q=${encodeURIComponent(value.trim())}`)

  return (
    <div className={cn('relative min-w-0', className)}>
      <label htmlFor="top-search" className="sr-only">
        Search your library
      </label>
      <div className="flex h-11.5 items-center gap-2.5 rounded-xl border-2 border-border bg-background px-3 focus-within:border-ring">
        <SearchIcon
          aria-hidden
          className="size-4.5 shrink-0 text-muted-foreground"
          strokeWidth={2.2}
        />
        <input
          ref={inputRef}
          id="top-search"
          type="search"
          role="combobox"
          aria-expanded={open && q.length > 0}
          aria-controls={listId}
          autoComplete="off"
          placeholder="Search your library — try “noodles video”"
          value={value}
          onChange={(e) => {
            setValue(e.target.value)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') seeAll()
            if (e.key === 'Escape') {
              setValue('')
              inputRef.current?.blur()
            }
          }}
          className="h-full min-w-0 flex-1 bg-transparent text-[15px] outline-none [&::-webkit-search-cancel-button]:hidden"
        />
        {value ? (
          <button
            type="button"
            aria-label="Clear search"
            onClick={() => {
              setValue('')
              inputRef.current?.focus()
            }}
            className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-muted"
          >
            <XIcon aria-hidden className="size-3" strokeWidth={3} />
          </button>
        ) : (
          <kbd
            aria-hidden
            className="hidden shrink-0 rounded-md border-[1.5px] border-line px-1.75 text-xs font-bold text-muted-foreground tablet:block"
          >
            /
          </kbd>
        )}
      </div>

      {open && q.length > 0 && (
        <div
          id={listId}
          role="listbox"
          aria-label="Search results"
          className="absolute inset-x-0 top-13.5 z-30 flex flex-col gap-0.5 rounded-2xl border-2 border-border bg-card p-2 shadow-pop"
        >
          <span className="px-2 pt-1 pb-1.5 text-xs font-bold tracking-wider text-muted-foreground">
            {results.isPending
              ? 'SEARCHING…'
              : results.isError
                ? 'SEARCH FAILED'
                : top.length
                  ? 'BEST MATCHES'
                  : 'NO MATCHES'}
          </span>
          {top.map((l) => (
            <button
              key={l.id}
              type="button"
              role="option"
              aria-selected={false}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => go(`/app/links?q=${encodeURIComponent(q)}&open=${l.id}`)}
              className="flex items-center gap-3 rounded-xl px-2 py-2 text-left hover:bg-muted"
            >
              <span
                className={cn(
                  'shrink-0 rounded-lg border-2 border-sticker-ink px-2 py-0.5 text-[11px] font-bold text-sticker-ink',
                  LINK_TYPE_DISPLAY[l.type].bg,
                )}
              >
                {LINK_TYPE_DISPLAY[l.type].label}
              </span>
              <span className="flex min-w-0 flex-1 flex-col">
                <strong className="truncate">{linkTitle(l)}</strong>
                {l.summary && (
                  <span className="truncate text-[13px] text-muted-foreground">{l.summary}</span>
                )}
              </span>
              <span className="hidden shrink-0 text-xs text-muted-foreground tablet:block">
                {l.collectionId ? collections[l.collectionId]?.name : 'Unsorted'}
              </span>
            </button>
          ))}
          {results.isError ? (
            <p className="px-2 py-2.5 text-muted-foreground">
              We couldn’t search just now. Try again in a moment.
            </p>
          ) : (
            !results.isPending &&
            !top.length && (
              <p className="px-2 py-2.5 text-muted-foreground">
                No matches for “{q}”. Try describing it differently.
              </p>
            )
          )}
          {top.length > 0 && (
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={seeAll}
              className="rounded-xl px-2 py-2 text-left text-sm font-bold underline underline-offset-3 hover:bg-muted"
            >
              See all results
            </button>
          )}
        </div>
      )}
    </div>
  )
}
