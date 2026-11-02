import type { Metadata } from 'next'
import { PageHeader } from '@/components/page-header'
import { Card, CardContent } from '@/components/ui/card'

export const metadata: Metadata = { title: 'Read later' }

export default function ReadLaterPage() {
  return (
    <>
      <PageHeader title="Read later" description="Your reading queue — readable offline." />
      <Card>
        <CardContent className="text-muted-foreground">Coming in a later phase.</CardContent>
      </Card>
    </>
  )
}
