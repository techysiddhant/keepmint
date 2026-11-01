'use client'

import { XIcon } from 'lucide-react'
import { Dialog as SheetPrimitive } from 'radix-ui'
import type { ComponentProps } from 'react'
import { cn } from '@/lib/utils'

// Bottom sheet on phones, side drawer on larger screens (details drawer, sync panel).

export const Sheet = SheetPrimitive.Root
export const SheetTrigger = SheetPrimitive.Trigger
export const SheetClose = SheetPrimitive.Close

export function SheetContent({
  className,
  children,
  side = 'right',
  ...props
}: ComponentProps<typeof SheetPrimitive.Content> & { side?: 'right' | 'bottom' }) {
  return (
    <SheetPrimitive.Portal>
      <SheetPrimitive.Overlay className="fixed inset-0 z-50 bg-black/45 animate-fade" />
      <SheetPrimitive.Content
        className={cn(
          'fixed z-50 flex flex-col gap-4 border-border bg-surface p-6',
          side === 'right' && 'inset-y-0 right-0 w-full max-w-[440px] border-l-2 animate-pop',
          side === 'bottom' &&
            'inset-x-0 bottom-0 max-h-[90dvh] rounded-t-[22px] border-t-2 animate-sheet',
          className,
        )}
        {...props}
      >
        {side === 'bottom' && (
          <span aria-hidden className="mx-auto -mt-2 h-1.5 w-12 rounded-full bg-line" />
        )}
        {children}
        <SheetPrimitive.Close
          aria-label="Close"
          className="absolute top-4 right-4 flex size-9 cursor-pointer items-center justify-center rounded-[10px] border-2 border-border bg-bg hover:bg-surface-2"
        >
          <XIcon className="size-4" aria-hidden />
        </SheetPrimitive.Close>
      </SheetPrimitive.Content>
    </SheetPrimitive.Portal>
  )
}

export function SheetTitle({ className, ...props }: ComponentProps<typeof SheetPrimitive.Title>) {
  return (
    <SheetPrimitive.Title
      className={cn('pr-10 font-display text-xl font-bold', className)}
      {...props}
    />
  )
}

export function SheetDescription({
  className,
  ...props
}: ComponentProps<typeof SheetPrimitive.Description>) {
  return <SheetPrimitive.Description className={cn('text-muted', className)} {...props} />
}
