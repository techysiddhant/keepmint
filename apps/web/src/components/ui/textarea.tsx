import { cn } from 'cn'
import type * as React from 'react'

function Textarea({ className, ...props }: React.ComponentProps<'textarea'>) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        // Same field look as Input: field background, 14px padding, hard violet shadow on focus.
        'flex field-sizing-content min-h-16 w-full rounded-xl border-2 border-input bg-field px-3.5 py-2.5 text-base text-foreground outline-none transition-[transform,box-shadow] duration-150 ease-pop placeholder:text-muted-foreground focus-visible:-translate-x-0.5 focus-visible:-translate-y-0.5 focus-visible:shadow-focus focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-60 aria-invalid:border-destructive',
        className,
      )}
      {...props}
    />
  )
}

export { Textarea }
