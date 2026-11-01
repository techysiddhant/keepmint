import type { ReactNode } from 'react'

export function PageHeader({
  title,
  description,
  children,
}: {
  title: string
  description?: string
  children?: ReactNode
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="flex flex-col gap-1">
        <h1 className="font-display text-[clamp(26px,4vw,34px)] leading-tight font-bold">
          {title}
        </h1>
        {description && <p className="text-muted">{description}</p>}
      </div>
      {children}
    </div>
  )
}
