import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { requireAdmin } from '@/lib/session'

export const metadata: Metadata = { title: 'Admin', robots: { index: false } }

export default async function AdminLayout({ children }: { children: ReactNode }) {
  await requireAdmin()
  return <div className="mx-auto max-w-6xl px-4 py-8 tablet:px-8">{children}</div>
}
