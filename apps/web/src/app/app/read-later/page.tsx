import type { Metadata } from 'next'
import { PageHeader } from '@/components/page-header'
import { Card } from '@/components/ui/card'

export const metadata: Metadata = { title: 'Read later' }

export default function ReadLaterPage() {
  return (
    <>
      <PageHeader title="Read later" description="Your reading queue — readable offline." />
      <Card className="text-muted">Coming in a later phase.</Card>
    </>
  )
}
