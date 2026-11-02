import type { Metadata } from 'next'
import { PageHeader } from '@/components/page-header'
import { Card, CardContent } from '@/components/ui/card'

export const metadata: Metadata = { title: 'Collections' }

export default function CollectionsPage() {
  return (
    <>
      <PageHeader title="Collections" description="Groups Keepmint builds for you." />
      <Card>
        <CardContent className="text-muted-foreground">Coming in a later phase.</CardContent>
      </Card>
    </>
  )
}
