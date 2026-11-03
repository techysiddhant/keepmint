'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { ThemeProvider } from 'next-themes'
import { type ReactNode, useState } from 'react'
import { Toaster } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      // Several components read the same data; don't refetch it for each one that mounts.
      queries: { staleTime: 5_000, retry: 2 },
      mutations: { retry: 0 },
    },
  })
}

export function Providers({ children }: { children: ReactNode }) {
  // One client per browser tab, created once (not on every render).
  const [queryClient] = useState(makeQueryClient)
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
        <TooltipProvider delay={300}>
          {children}
          <Toaster />
        </TooltipProvider>
      </ThemeProvider>
      {/* Renders nothing in production builds. */}
      <ReactQueryDevtools buttonPosition="bottom-left" />
    </QueryClientProvider>
  )
}
