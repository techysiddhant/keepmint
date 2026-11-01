import { Tabs as TabsPrimitive } from 'radix-ui'
import type { ComponentProps } from 'react'
import { cn } from '@/lib/utils'

export const Tabs = TabsPrimitive.Root

export function TabsList({ className, ...props }: ComponentProps<typeof TabsPrimitive.List>) {
  return (
    <TabsPrimitive.List
      className={cn(
        'inline-flex gap-1 rounded-xl border-2 border-border bg-surface p-1',
        className,
      )}
      {...props}
    />
  )
}

export function TabsTrigger({ className, ...props }: ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      className={cn(
        'h-9 cursor-pointer rounded-lg px-3 text-sm font-bold text-muted transition-colors hover:text-ink data-[state=active]:bg-surface-2 data-[state=active]:text-ink',
        className,
      )}
      {...props}
    />
  )
}

export const TabsContent = TabsPrimitive.Content
