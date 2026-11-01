import type { ComponentProps } from 'react'
import { cn } from '@/lib/utils'

export function Input({ className, ...props }: ComponentProps<'input'>) {
  return (
    <input
      className={cn(
        'h-12 w-full min-w-0 rounded-xl border-2 border-border bg-surface px-3.5 text-[15px] text-ink outline-none transition-[transform,box-shadow] duration-150 ease-pop placeholder:text-muted focus:-translate-x-0.5 focus:-translate-y-0.5 focus:shadow-focus aria-invalid:border-err-ink disabled:opacity-60',
        className,
      )}
      {...props}
    />
  )
}
