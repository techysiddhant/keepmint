import type { Metadata } from 'next'
import { PageHeader } from '@/components/page-header'
import { Card } from '@/components/ui/card'

export const metadata: Metadata = { title: 'Settings' }

export default function SettingsPage() {
  return (
    <>
      <PageHeader
        title="Settings"
        description="Changes save automatically unless a section asks you to confirm."
      />
      <Card className="text-muted">Coming in a later phase.</Card>
    </>
  )
}
