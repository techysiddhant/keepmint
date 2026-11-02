import type { ReactNode } from 'react'
import { AppShell } from '@/components/app-shell'
import { AddLinkProvider } from '@/components/library/add-link'
import { LibraryProvider } from '@/components/library/library-provider'
import { requireUser } from '@/lib/session'

export default async function AppLayout({ children }: { children: ReactNode }) {
  const user = await requireUser()
  return (
    <LibraryProvider>
      <AddLinkProvider>
        <AppShell
          user={{
            name: user.name,
            email: user.email,
            role: user.role ?? 'user',
            timezone: user.timezone ?? 'UTC',
          }}
        >
          {children}
        </AppShell>
      </AddLinkProvider>
    </LibraryProvider>
  )
}
