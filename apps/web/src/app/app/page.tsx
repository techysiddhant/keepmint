import type { Metadata } from 'next'
import { PageHeader } from '@/components/page-header'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

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
          <Card key={s.label}>
            <CardHeader>
              <CardDescription className="font-bold">{s.label}</CardDescription>
              <CardTitle className="font-display text-3xl">{s.value}</CardTitle>
            </CardHeader>
          </Card>
        ))}
      </section>
      <Card className="mt-6">
        <CardContent className="flex flex-wrap items-center gap-3">
          <Badge>Phase 0</Badge>
          <span className="text-muted-foreground">
            App shell only — saving links arrives in Phase 2.
          </span>
        </CardContent>
      </Card>
    </>
  )
}
