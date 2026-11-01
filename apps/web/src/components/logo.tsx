import { cn } from '@/lib/utils'

/** Yellow bookmark tile used in the nav and auth screens. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        'flex size-8 shrink-0 items-center justify-center rounded-[9px] border-2 border-border bg-yellow',
        className,
      )}
    >
      <svg width="12" height="14" viewBox="0 0 12 14" aria-hidden="true">
        <path d="M1 1h10v12L6 9.5 1 13z" fill="#111111" />
      </svg>
    </span>
  )
}
