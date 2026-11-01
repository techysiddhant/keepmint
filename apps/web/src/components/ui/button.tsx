import { cva, type VariantProps } from 'class-variance-authority'
import { Slot } from 'radix-ui'
import type { ComponentProps } from 'react'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 whitespace-nowrap border-2 border-border font-bold transition-[transform,box-shadow,background] duration-150 ease-pop disabled:cursor-not-allowed disabled:opacity-60 [&_svg]:size-[18px] [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        primary:
          'bg-violet text-white shadow-hard hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-hard-lg active:translate-x-0.5 active:translate-y-0.5 active:shadow-none disabled:translate-0 disabled:shadow-none',
        secondary:
          'bg-surface text-ink shadow-hard hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-hard-lg active:translate-x-0.5 active:translate-y-0.5 active:shadow-none disabled:translate-0 disabled:shadow-none',
        sticker:
          'bg-yellow text-sticker-ink shadow-hard hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-hard-lg active:translate-x-0.5 active:translate-y-0.5 active:shadow-none',
        ghost: 'border-transparent bg-transparent text-ink hover:bg-surface-2',
        outline: 'bg-bg text-ink hover:bg-surface-2',
        danger:
          'bg-pink text-sticker-ink shadow-hard hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-hard-lg active:translate-x-0.5 active:translate-y-0.5 active:shadow-none',
      },
      size: {
        sm: 'h-9 rounded-[10px] px-3 text-sm',
        md: 'h-11 rounded-xl px-4 text-[15px]',
        lg: 'h-[50px] rounded-[14px] px-5 text-base',
        icon: 'size-10 rounded-xl',
      },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  },
)

export function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: ComponentProps<'button'> & VariantProps<typeof buttonVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : 'button'
  return <Comp className={cn(buttonVariants({ variant, size }), className)} {...props} />
}

export { buttonVariants }
