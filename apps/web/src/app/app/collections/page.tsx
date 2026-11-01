import type { Metadata } from 'next'
import { PageHeader } from '@/components/page-header'
import { Card } from '@/components/ui/card'

export const metadata: Metadata = { title: 'Collections' }

export default function CollectionsPage() {
  return (
    <>
      <PageHeader title="Collections" description="Groups Keepmint builds for you." />
      <Card className="text-muted">Coming in a later phase.</Card>
    </>
  )
}
