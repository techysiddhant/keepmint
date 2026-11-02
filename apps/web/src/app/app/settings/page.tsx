import type { Metadata } from 'next'
import { PageHeader } from '@/components/page-header'
import { Card, CardContent } from '@/components/ui/card'

export const metadata: Metadata = { title: 'Settings' }

export default function SettingsPage() {
  return (
    <>
      <PageHeader
        title="Settings"
        description="Changes save automatically unless a section asks you to confirm."
      />
      <Card>
        <CardContent className="text-muted-foreground">Coming in a later phase.</CardContent>
      </Card>
    </>
  )
}
