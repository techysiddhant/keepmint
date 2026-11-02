import { resolve } from 'node:path'
import { config } from 'dotenv'
import type { NextConfig } from 'next'

// One .env at the repo root for local dev. On Vercel, variables come from the dashboard.
config({ path: resolve(import.meta.dirname, '../../.env'), quiet: true })

const nextConfig: NextConfig = {
  transpilePackages: ['@keepmint/core', '@keepmint/db', '@keepmint/email'],
  serverExternalPackages: ['pg', 'pg-boss'],
  // Keep the dev badge off the sidebar's bottom-left Settings button.
  devIndicators: { position: 'bottom-right' },
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          // No other site may frame Keepmint (clickjacking on login / reset pages).
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Content-Security-Policy', value: "frame-ancestors 'none'" },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          // Reset and verify links carry tokens in the URL; never send them to other sites.
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
    ]
  },
}

export default nextConfig
