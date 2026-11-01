import { resolve } from 'node:path'
import { config } from 'dotenv'
import type { NextConfig } from 'next'

// One .env at the repo root for local dev. On Vercel, variables come from the dashboard.
config({ path: resolve(import.meta.dirname, '../../.env'), quiet: true })

const nextConfig: NextConfig = {
  transpilePackages: ['@keepmint/core', '@keepmint/db', '@keepmint/email'],
  serverExternalPackages: ['pg'],
  // Keep the dev badge off the sidebar's bottom-left Settings button.
  devIndicators: { position: 'bottom-right' },
}

export default nextConfig
