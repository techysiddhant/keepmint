import { config } from 'dotenv'
import { defineConfig } from 'drizzle-kit'

// drizzle-kit loads this file as CommonJS, so resolve the root .env from the package folder.
config({ path: '../../.env', quiet: true })

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/schema/index.ts',
  out: './drizzle',
  casing: 'snake_case',
  dbCredentials: { url: process.env.DATABASE_URL ?? '' },
})
