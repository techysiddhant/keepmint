import type { Metadata } from 'next'
import { PageHeader } from '@/components/page-header'
import { Card } from '@/components/ui/card'

export const metadata: Metadata = { title: 'All links' }

export default function AllLinksPage() {
  return (
    <>
      <PageHeader title="All links" description="Every link you've saved, sorted by AI." />
      <Card className="text-muted">Coming in a later phase.</Card>
    </>
  )
}
