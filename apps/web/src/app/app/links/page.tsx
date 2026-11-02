import type { Metadata } from 'next'
import { PageHeader } from '@/components/page-header'
import { Card, CardContent } from '@/components/ui/card'

export const metadata: Metadata = { title: 'All links' }

export default function AllLinksPage() {
  return (
    <>
      <PageHeader title="All links" description="Every link you've saved, sorted by AI." />
      <Card>
        <CardContent className="text-muted-foreground">Coming in a later phase.</CardContent>
      </Card>
    </>
  )
}
