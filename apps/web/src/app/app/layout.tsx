import type { ReactNode } from 'react'
import { AppShell } from '@/components/app-shell'
import { AddLinkProvider } from '@/components/library/add-link'
import { LibraryUserProvider } from '@/components/library/use-library'
import { requireUser } from '@/lib/session'

export default async function AppLayout({ children }: { children: ReactNode }) {
  const user = await requireUser()
  return (
    <LibraryUserProvider userId={user.id}>
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
    </LibraryUserProvider>
  )
}
