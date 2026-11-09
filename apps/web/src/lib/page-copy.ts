import 'server-only'
import { gunzipSync } from 'node:zlib'
import { AwsClient } from 'aws4fetch'
import { serverEnv } from './env'

let client: { aws: AwsClient; base: string } | null | undefined

function r2() {
  if (client !== undefined) return client
  const env = serverEnv()
  client =
    env.R2_ACCOUNT_ID && env.R2_ACCESS_KEY_ID && env.R2_SECRET_ACCESS_KEY && env.R2_BUCKET
      ? {
          aws: new AwsClient({
            accessKeyId: env.R2_ACCESS_KEY_ID,
            secretAccessKey: env.R2_SECRET_ACCESS_KEY,
            service: 's3',
            region: 'auto',
          }),
          base: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${env.R2_BUCKET}`,
        }
      : null
  return client
}

const READ_TIMEOUT_MS = 10_000

/** Most paragraphs sent to the reader (a very long page is cut, not refused). */
const MAX_PARAGRAPHS = 400

/**
 * The stored text copy of a page (`pages/<url_hash>.txt.gz`), split into paragraphs.
 * Returns null when R2 isn't configured here or the copy can't be read.
 */
export async function readPageCopy(key: string): Promise<string[] | null> {
  const store = r2()
  // Keys are written by the worker as pages/<sha256>.txt.gz; never follow anything else.
  if (!store || !/^pages\/[0-9a-f]{64}\.txt\.gz$/.test(key)) return null
  const res = await store.aws.fetch(`${store.base}/${key}`, {
    signal: AbortSignal.timeout(READ_TIMEOUT_MS),
  })
  if (!res.ok) return null
  const bytes = Buffer.from(await res.arrayBuffer())
  // Stored gzipped; some clients already undo `content-encoding: gzip` on the way in.
  const text =
    bytes[0] === 0x1f && bytes[1] === 0x8b ? gunzipSync(bytes).toString() : bytes.toString()
  const blocks = text.includes('\n\n') ? text.split(/\n{2,}/) : text.split('\n')
  return blocks
    .map((p) => p.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .flatMap(splitLong)
    .slice(0, MAX_PARAGRAPHS)
}

/**
 * Copies saved before paragraph breaks were kept can be one huge block: break those into
 * readable chunks of a few sentences.
 */
function splitLong(block: string): string[] {
  if (block.length <= 1500) return [block]
  const sentences = block.match(/[^.!?]+[.!?]+["”’)]*\s*|[^.!?]+$/g) ?? [block]
  const chunks: string[] = []
  let current = ''
  for (const s of sentences) {
    if (current && current.length + s.length > 600) {
      chunks.push(current.trim())
      current = ''
    }
    current += s
  }
  if (current.trim()) chunks.push(current.trim())
  return chunks
}
