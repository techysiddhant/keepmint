'use client'

import { LinkIcon, XIcon } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { useAddLink } from './add-link'
import { EmptyState } from './empty-state'
import { LinkBrowser } from './link-browser'
import { useLibrary } from './use-library'

export function AllLinksView({ query, openId }: { query: string; openId: string | null }) {
  const { links, loaded } = useLibrary()
  const { open: openAddLink } = useAddLink()
  const scope = Object.values(links)
  const unread = scope.filter((l) => l.readState !== 'done').length

  if (!loaded) return <div className="h-64 animate-pulse rounded-[20px] bg-muted" />

  return (
    <div className="mx-auto max-w-290">
      <LinkBrowser
        scope={scope}
        query={query}
        initialOpenId={openId}
        header={(controls) => (
          <div className="flex flex-wrap items-end justify-between gap-3.5">
            <div className="flex flex-col gap-1">
              <h1 className="font-display text-[clamp(26px,4vw,34px)] leading-tight font-extrabold tracking-tight">
                {query ? 'Search' : 'All links'}
              </h1>
              {query ? (
                <p className="flex items-center gap-2 text-muted-foreground">
                  Results for <strong className="text-foreground">“{query}”</strong>
                  <Link
                    href="/app/links"
                    aria-label="Clear search"
                    className="flex size-6 items-center justify-center rounded-md hover:bg-muted"
                  >
                    <XIcon aria-hidden className="size-3.5" strokeWidth={3} />
                  </Link>
                </p>
              ) : (
                <p className="text-muted-foreground">
                  {scope.length ? `${scope.length} saved · ${unread} unread` : 'Nothing here yet'}
                </p>
              )}
            </div>
            {controls}
          </div>
        )}
        emptyLibrary={
          <EmptyState
            icon={LinkIcon}
            colors={['bg-sky', 'bg-yellow']}
            title="Your library is empty"
            actions={<Button onClick={() => openAddLink()}>Add your first link</Button>}
          >
            Every link you save lands here, summarised and tagged. Paste one now, or press N
            anywhere.
          </EmptyState>
        }
      />
    </div>
  )
}
