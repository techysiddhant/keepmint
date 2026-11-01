import type { Metadata } from 'next'
import { PageHeader } from '@/components/page-header'
import { Card } from '@/components/ui/card'
import { Chip } from '@/components/ui/chip'

export const metadata: Metadata = { title: 'Dashboard' }

const STATS = [
  { label: 'Saved this week', value: '—' },
  { label: 'In your library', value: '—' },
  { label: 'Waiting to sync', value: '—' },
  { label: 'AI sorts today', value: '0 / 50' },
]

export default function DashboardPage() {
  return (
    <>
      <PageHeader title="Good afternoon" description="Here's your library at a glance" />
      <section aria-label="Key numbers" className="grid grid-cols-2 gap-4 desktop:grid-cols-4">
        {STATS.map((s) => (
          <Card key={s.label} className="flex flex-col gap-1">
            <span className="text-sm font-bold text-muted">{s.label}</span>
            <span className="font-display text-3xl font-bold">{s.value}</span>
          </Card>
        ))}
      </section>
      <Card className="mt-6 flex flex-wrap items-center gap-3">
        <Chip tone="violet">Phase 0</Chip>
        <span className="text-muted">App shell only — saving links arrives in Phase 2.</span>
      </Card>
    </>
  )
}
