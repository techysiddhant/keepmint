import type { LinkType } from '@keepmint/core'
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
export function timeAgo(iso: string, now = Date.now()) {
  const s = Math.max(0, Math.round((now - new Date(iso).getTime()) / 1000))
  if (s < 60) return 'Just now'
  if (s < 3600) return `${Math.floor(s / 60)}m`
  if (s < 86_400) return `${Math.floor(s / 3600)}h`
  if (s < 172_800) return 'Yesterday'
  return new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })
}
