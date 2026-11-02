/**
 * Runs the fixture links through the real pipeline (read → Claude) without touching the
 * database, and prints summary, collection and cost per link.
 *
 *   pnpm --filter @keepmint/worker quality          # reads pages only, no AI (free)
 *   pnpm --filter @keepmint/worker quality --ai     # also calls Claude (~30 calls, ≈ $0.01)
 */
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { type AiCollection, sortLink } from '../lib/ai'
import { readPage } from '../lib/read-page'

const withAi = process.argv.includes('--ai')
const fixtures = JSON.parse(
  await readFile(resolve(import.meta.dirname, 'fixtures/quality-links.json'), 'utf8'),
) as Array<{ kind: string; url: string }>

// A small, realistic library so the collection choice has something to match.
const collections: AiCollection[] = [
  { name: 'Cooking', description: 'Recipes and food' },
  { name: 'Dev tools', description: 'Libraries, repos and developer tooling' },
  { name: 'Reading', description: 'Essays and long reads' },
]

let calls = 0
let cost = 0
let failed = 0
for (const { kind, url } of fixtures) {
  const started = Date.now()
  const read = await readPage(url)
  if (!read.ok) {
    failed++
    console.log(`✗ [${kind}] ${url}\n    failed (no AI): ${read.reason}\n`)
    continue
  }
  const { page } = read
  if (!withAi) {
    console.log(
      `✓ [${kind}] ${page.title}\n    type=${page.type ?? '(AI decides)'} text=${page.text.length} chars, ${Date.now() - started} ms\n`,
    )
    continue
  }
  try {
    const { output, usage } = await sortLink(page, collections, [])
    calls++
    cost += usage.costUsd
    console.log(
      `✓ [${kind}] ${page.title}\n    ${output.summary}\n    type=${page.type ?? output.type} → ${output.collection ?? 'Unsorted'}${output.newCollection ? ' (new)' : ''} @ ${output.confidence.toFixed(2)} · tags: ${output.tags.join(', ')}\n    ${usage.inputTokens} in / ${usage.outputTokens} out · $${usage.costUsd.toFixed(6)} · ${usage.latencyMs} ms\n`,
    )
  } catch (err) {
    console.log(`✗ [${kind}] ${url}\n    AI error: ${(err as Error).message}\n`)
  }
}

console.log(`${fixtures.length} links · ${failed} failed before AI · ${calls} AI calls`)
if (calls) {
  const avg = cost / calls
  console.log(
    `total $${cost.toFixed(5)} · average $${avg.toFixed(6)} per link (target ≤ $0.0003) ${avg <= 0.0003 ? '✓' : '✗ over target'}`,
  )
}
