/**
 * Checks the R2 setup end to end: reads a real page, stores its copy exactly as the
 * worker does (`pages/<url_hash>.txt.gz`) and reads it back.
 *
 *   pnpm --filter @keepmint/worker r2:test
 */
import { gunzipSync } from 'node:zlib'
import { urlHash } from '@keepmint/core'
import { AwsClient } from 'aws4fetch'
import { env } from '../env'
import { storePageCopy } from '../lib/r2'
import { readPage } from '../lib/read-page'

const url = 'https://paulgraham.com/greatwork.html'
const read = await readPage(url)
if (!read.ok) throw new Error(`Couldn't read the test page: ${read.reason}`)

const stored = await storePageCopy(await urlHash(url), read.page.text)
if (!stored) {
  console.error('Upload failed (or R2 is not configured) — see the error above.')
  process.exit(1)
}
console.log(`stored ${stored.key} (${stored.bytes} bytes gzipped)`)

const client = new AwsClient({
  accessKeyId: env.R2_ACCESS_KEY_ID as string,
  secretAccessKey: env.R2_SECRET_ACCESS_KEY as string,
  service: 's3',
  region: 'auto',
})
const res = await client.fetch(
  `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${env.R2_BUCKET}/${stored.key}`,
)
const body = Buffer.from(await res.arrayBuffer())
// Some clients decompress `content-encoding: gzip` on the fly; handle both.
const text = body[0] === 0x1f && body[1] === 0x8b ? gunzipSync(body).toString() : body.toString()
const ok = res.ok && text === read.page.text
console.log(
  `read back: HTTP ${res.status}, ${text.length} chars — ${ok ? 'matches ✓' : 'MISMATCH ✗'}`,
)
process.exit(ok ? 0 : 1)
