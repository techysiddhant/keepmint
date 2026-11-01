import type { ComponentProps } from 'react'
import { cn } from '@/lib/utils'

/** Surface with an ink border and a hard offset shadow. `lift` adds the hover lift. */
export function Card({ className, lift, ...props }: ComponentProps<'div'> & { lift?: boolean }) {
  return (
    <div
      className={cn(
        'rounded-2xl border-2 border-border bg-surface p-5 shadow-card',
        lift &&
          'transition-[transform,box-shadow] duration-200 ease-pop hover:-translate-x-0.5 hover:-translate-y-[3px] hover:shadow-[7px_7px_0_var(--shadow)]',
        className,
      )}
      {...props}
    />
  )
}
