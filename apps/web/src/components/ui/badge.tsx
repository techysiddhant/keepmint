import { mergeProps } from '@base-ui/react/merge-props'
import { useRender } from '@base-ui/react/use-render'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from 'cn'

// Sticker chips from the design: 2px ink border, bold label, one colour per meaning.
const badgeVariants = cva(
  'group/badge inline-flex w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-lg border-2 border-border px-2 py-0.5 text-xs font-bold whitespace-nowrap transition-transform focus-visible:outline-2 [&>svg]:pointer-events-none [&>svg]:size-3!',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground',
        secondary: 'bg-muted text-foreground',
        outline: 'bg-transparent text-foreground',
        destructive: 'border-destructive bg-fail-soft text-err-ink',
        yellow: 'bg-yellow text-sticker-ink',
        mint: 'bg-mint text-sticker-ink',
        pink: 'bg-pink text-sticker-ink',
        sky: 'bg-sky text-sticker-ink',
        lilac: 'bg-lilac text-sticker-ink',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
)

/** Badge colour for each link type, as in the design. */
const linkTypeBadge = {
  video: 'pink',
  article: 'yellow',
  recipe: 'yellow',
  repo: 'mint',
  thread: 'lilac',
  job: 'sky',
  product: 'lilac',
  podcast: 'pink',
  pdf: 'yellow',
  other: 'secondary',
} as const

function Badge({
  className,
  variant = 'default',
  render,
  ...props
}: useRender.ComponentProps<'span'> & VariantProps<typeof badgeVariants>) {
  return useRender({
    defaultTagName: 'span',
    props: mergeProps<'span'>(
      {
        className: cn(badgeVariants({ variant }), className),
      },
      props,
    ),
    render,
    state: {
      slot: 'badge',
      variant,
    },
  })
}

export { Badge, badgeVariants, linkTypeBadge }
