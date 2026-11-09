import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

/** The design's empty state: two tilted stickers, a title, a line of text and actions. */
export function EmptyState({
  icon: Icon,
  colors,
  title,
  children,
  actions,
}: {
  icon: LucideIcon
  colors: [string, string]
  title: string
  children: ReactNode
  actions?: ReactNode
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-[22px] border-2 border-dashed border-line px-5 py-12 text-center">
      <div aria-hidden className="relative mb-2 h-20 w-24">
        <span
          className={cn(
            'absolute top-2 left-0 size-16 -rotate-8 rounded-2xl border-2 border-sticker-ink',
            colors[1],
          )}
        />
        <span
          className={cn(
            'absolute top-0 right-0 flex size-16 rotate-6 items-center justify-center rounded-2xl border-2 border-sticker-ink text-sticker-ink',
            colors[0],
          )}
        >
          <Icon className="size-7" strokeWidth={2.2} />
        </span>
      </div>
      <strong className="font-display text-xl">{title}</strong>
      <p className="max-w-110 text-muted-foreground">{children}</p>
      {actions && <div className="mt-1 flex flex-wrap justify-center gap-2.5">{actions}</div>}
    </div>
  )
}
