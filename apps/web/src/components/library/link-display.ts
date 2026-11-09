import {
  type CollectionColor,
  isLinkBusy,
  isLinkStuck,
  type LinkType,
  type SyncLink,
} from '@keepmint/core'
import {
  BriefcaseIcon,
  ChefHatIcon,
  CodeIcon,
  FileTextIcon,
  LinkIcon,
  type LucideIcon,
  MessageSquareIcon,
  MicIcon,
  NewspaperIcon,
  PlayIcon,
  ShoppingBagIcon,
} from 'lucide-react'

/** How each link type looks: label, icon and sticker colour (from the design). */
export const LINK_TYPE_DISPLAY: Record<LinkType, { label: string; icon: LucideIcon; bg: string }> =
  {
    article: { label: 'Article', icon: NewspaperIcon, bg: 'bg-sky' },
    video: { label: 'Video', icon: PlayIcon, bg: 'bg-pink' },
    repo: { label: 'Repo', icon: CodeIcon, bg: 'bg-lilac' },
    thread: { label: 'Thread', icon: MessageSquareIcon, bg: 'bg-sky' },
    recipe: { label: 'Recipe', icon: ChefHatIcon, bg: 'bg-yellow' },
    product: { label: 'Product', icon: ShoppingBagIcon, bg: 'bg-mint' },
    podcast: { label: 'Podcast', icon: MicIcon, bg: 'bg-lilac' },
    pdf: { label: 'PDF', icon: FileTextIcon, bg: 'bg-yellow' },
    job: { label: 'Job', icon: BriefcaseIcon, bg: 'bg-mint' },
    other: { label: 'Link', icon: LinkIcon, bg: 'bg-sky' },
  }

/** "3m", "2h", "Yesterday", "12 Mar". */
export function timeAgo(iso: string, now: number) {
  const s = Math.max(0, Math.round((now - new Date(iso).getTime()) / 1000))
  if (s < 60) return 'Just now'
  if (s < 3600) return `${Math.floor(s / 60)}m`
  if (s < 86_400) return `${Math.floor(s / 3600)}h`
  if (s < 172_800) return 'Yesterday'
  return new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })
}

/** Sticker colour class for each collection colour (full class names, for Tailwind). */
export const COLLECTION_BG: Record<CollectionColor, string> = {
  violet: 'bg-violet text-white',
  pink: 'bg-pink text-sticker-ink',
  yellow: 'bg-yellow text-sticker-ink',
  mint: 'bg-mint text-sticker-ink',
  sky: 'bg-sky text-sticker-ink',
  lilac: 'bg-lilac text-sticker-ink',
}

export const linkTitle = (l: SyncLink) => l.title ?? l.site ?? l.url

/** Being read right now (not stuck). `now` comes from useNow() in components. */
export const isReading = (l: SyncLink, now: number) => isLinkBusy(l) && !isLinkStuck(l, now)

/** Needs the user: couldn't be read, or stuck waiting for a worker that never came. */
export const needsRetry = (l: SyncLink, now: number) => l.status === 'failed' || isLinkStuck(l, now)

export const STUCK_REASON = 'This is taking too long. Try again.'

/** "8 min read" / "12 min watch". */
export function lengthText(l: SyncLink) {
  if (!l.readMinutes) return null
  const verb = l.type === 'video' || l.type === 'podcast' ? 'watch' : 'read'
  return `${l.readMinutes} min ${verb}`
}

export function formatBytes(bytes: number) {
  return bytes < 1024 * 1024
    ? `${Math.max(1, Math.round(bytes / 1024))} KB`
    : `${(bytes / 1024 / 1024).toFixed(1)} MB`
}
