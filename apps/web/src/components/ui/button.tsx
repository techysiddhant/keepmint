import { Button as ButtonPrimitive } from '@base-ui/react/button'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from 'cn'

// Pop look: 2px ink border, hard offset shadow that lifts on hover and sinks on press.
const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center gap-2 border-2 border-border font-bold whitespace-nowrap outline-none select-none disabled:pointer-events-none disabled:opacity-60 data-disabled:pointer-events-none data-disabled:opacity-60 aria-invalid:border-destructive [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-[18px]",
  {
    variants: {
      variant: {
        default: 'press bg-primary text-primary-foreground',
        secondary: 'press bg-secondary text-secondary-foreground',
        sticker: 'press bg-yellow text-sticker-ink',
        outline:
          'bg-background text-foreground transition-colors hover:bg-muted aria-expanded:bg-muted',
        ghost:
          'border-transparent bg-transparent text-foreground transition-colors hover:bg-muted aria-expanded:bg-muted',
        destructive: 'press bg-pink text-sticker-ink',
        // `px-0!` so the size variant's padding can't push the text away from its underline.
        link: 'border-transparent px-0! text-foreground underline decoration-2 underline-offset-[3px] hover:decoration-primary',
      },
      size: {
        default: 'h-11 rounded-xl px-4 text-[15px]',
        sm: "h-9 gap-1.5 rounded-[10px] px-3 text-sm [&_svg:not([class*='size-'])]:size-4",
        lg: 'h-12.5 rounded-[14px] px-5 text-base',
        xl: 'h-14 rounded-[14px] px-6 text-[17px]',
        icon: 'size-10 rounded-xl',
        'icon-sm': "size-8 rounded-[9px] [&_svg:not([class*='size-'])]:size-4",
        'icon-lg': 'size-12 rounded-[14px]',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
)

function Button({
  className,
  variant = 'default',
  size = 'default',
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
