import type { Metadata } from 'next'
import { AllLinksView } from '@/components/library/all-links-view'

export const metadata: Metadata = { title: 'All links' }

export default async function AllLinksPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string | string[]; open?: string | string[] }>
}) {
  const { q, open } = await searchParams
  const first = (v?: string | string[]) => (Array.isArray(v) ? v[0] : v)
  return (
    <AllLinksView
      query={first(q)?.slice(0, 200) ?? ''}
      openId={first(open)?.slice(0, 36) ?? null}
    />
  )
}
