import { cva, type VariantProps } from 'class-variance-authority'
import type { ComponentProps } from 'react'
import { cn } from '@/lib/utils'

const chipVariants = cva(
  'inline-flex items-center gap-1 rounded-lg border-2 border-border px-2 py-0.5 text-xs font-bold',
  {
    variants: {
      tone: {
        neutral: 'bg-surface-2 text-ink',
        violet: 'bg-violet text-white',
        yellow: 'bg-yellow text-sticker-ink',
        mint: 'bg-mint text-sticker-ink',
        pink: 'bg-pink text-sticker-ink',
        sky: 'bg-sky text-sticker-ink',
        lilac: 'bg-lilac text-sticker-ink',
      },
    },
    defaultVariants: { tone: 'neutral' },
  },
)

export function Chip({
  className,
  tone,
  ...props
}: ComponentProps<'span'> & VariantProps<typeof chipVariants>) {
  return <span className={cn(chipVariants({ tone }), className)} {...props} />
}

/** Chip colour for each link type, as in the design. */
export const linkTypeTone = {
  video: 'pink',
  article: 'yellow',
  recipe: 'yellow',
  repo: 'mint',
  thread: 'lilac',
  job: 'sky',
  product: 'lilac',
  podcast: 'pink',
  pdf: 'yellow',
  other: 'neutral',
} as const
