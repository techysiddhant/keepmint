# Keepmint

**AI bookmark manager that works offline.** Paste any link — article, video, thread, repo, recipe — and Keepmint reads it, writes a two-line summary, tags it and files it into the right collection. The whole library works on a plane and syncs when you land.

> Status: **in development** — free beta coming soon at [keepmint.store](https://keepmint.store). Built solo.

<!-- Screenshots / demo GIF go here once Phase 2 ships -->

---

## Highlights

- **Offline-first PWA** — the app reads from a local IndexedDB database; saves made offline queue up in an outbox and sync when the device reconnects.
- **AI that stays cheap** — one structured Claude Haiku call per link, input trimmed to ~1,200 tokens, a shared summary cache across users, and a hard per-user daily cap. Target: ~$0.00025 per link.
- **Background worker** — page fetching, cleaning and AI run in a Postgres-backed job queue, so saving is instant and retries are automatic.
- **Admin controls** — per-user AI on/off, custom limits, a global kill switch and an insert-only audit log.

## Stack

| Layer           | Tech                                                      |
| --------------- | --------------------------------------------------------- |
| Web             | Next.js (App Router), React, TypeScript, Tailwind CSS v4  |
| Offline         | Dexie (IndexedDB), Serwist (service worker), MiniSearch   |
| Auth            | Better Auth                                               |
| Database        | Postgres (Neon) + Drizzle ORM                             |
| Jobs            | pg-boss on a Node worker (Railway)                        |
| AI              | Anthropic Claude Haiku                                    |
| Storage / email | Cloudflare R2, Resend                                     |
| Tooling         | pnpm workspaces, Turborepo, Biome, GitHub Actions, Sentry |

## Architecture

```
Browser / PWA (Dexie + outbox) ──sync──▶ Next.js API (Vercel) ──▶ Postgres (Neon)
                                                                   │ jobs
                                                                   ▼
                                        Worker (Railway): fetch → clean → Claude → save
                                                                   │
                                                          Cloudflare R2 (page copies)
```

## Repository

```
apps/web        Next.js — landing, auth, app, admin, API
apps/worker     Node worker — background jobs
packages/core   shared types, constants, URL helpers, AI output schema
packages/db     Drizzle schema, migrations, seed
packages/email  React Email templates
planning/       product plan, database design, build phases
```

The full plan — decisions, cost model, database design and phase checklists — is in [`planning/`](planning/README.md).

## Running locally

Requires Node 24+ and pnpm 10.

```bash
pnpm install
cp .env.example .env   # fill in DATABASE_URL at least
pnpm db:migrate
pnpm db:seed           # local DB only; add --allow-remote for a Neon dev branch
pnpm dev               # web on :3000 + worker
```

## License

Source available for viewing only — all rights reserved. See [LICENSE](LICENSE).
