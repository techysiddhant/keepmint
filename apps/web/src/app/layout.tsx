import type { Metadata, Viewport } from 'next'
import { DM_Sans, Unbounded } from 'next/font/google'
import type { ReactNode } from 'react'
import { Providers } from '@/components/providers'
import './globals.css'

const dmSans = DM_Sans({ subsets: ['latin'], variable: '--font-dm-sans', display: 'swap' })
const unbounded = Unbounded({
  subsets: ['latin'],
  weight: ['500', '700', '800'],
  variable: '--font-unbounded',
  display: 'swap',
})

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'https://keepmint.store'),
  applicationName: 'Keepmint',
  title: { default: 'Keepmint — your links, sorted by AI', template: '%s · Keepmint' },
  description:
    'Save any link. Keepmint reads it, sums it up and files it into the right collection — online or off.',
}

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#F1EEFF' },
    { media: '(prefers-color-scheme: dark)', color: '#1B1B1E' },
  ],
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={`${dmSans.variable} ${unbounded.variable}`}>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
