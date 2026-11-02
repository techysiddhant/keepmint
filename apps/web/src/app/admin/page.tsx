import Link from 'next/link'
import { PageHeader } from '@/components/page-header'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'

// The real admin dashboard arrives in Phase 6.
export default function AdminPage() {
  return (
    <>
      <PageHeader title="Admin" description="Beta at a glance">
        <Link href="/app" className="font-bold underline underline-offset-[3px]">
          Back to the app
        </Link>
      </PageHeader>
      <Card>
        <CardContent className="flex flex-wrap items-center gap-3">
          <Badge>Phase 6</Badge>
          <span className="text-muted-foreground">
            Users, AI usage, limits and the audit log arrive in Phase 6.
          </span>
        </CardContent>
      </Card>
    </>
  )
}
