import { promisify } from 'node:util'
import { gzip } from 'node:zlib'
import { AwsClient } from 'aws4fetch'
import { env } from '../env'
import { log } from '../logger'

const gzipAsync = promisify(gzip)

const r2 =
  env.R2_ACCOUNT_ID && env.R2_ACCESS_KEY_ID && env.R2_SECRET_ACCESS_KEY && env.R2_BUCKET
    ? {
        client: new AwsClient({
          accessKeyId: env.R2_ACCESS_KEY_ID,
          secretAccessKey: env.R2_SECRET_ACCESS_KEY,
          service: 's3',
          region: 'auto',
        }),
        base: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${env.R2_BUCKET}`,
      }
    : null

if (!r2) log.warn('R2 not configured: page copies will not be stored')

/**
 * Stores the clean page text, gzipped, at `pages/<url_hash>.txt.gz` (shared by everyone
 * who saves the same URL). Returns null when R2 isn't configured or the upload fails:
 * a missing page copy never fails the link.
 */
export async function storePageCopy(urlHash: string, text: string) {
  if (!r2) return null
  const key = `pages/${urlHash}.txt.gz`
  try {
    const body = await gzipAsync(Buffer.from(text, 'utf8'))
    const res = await r2.client.fetch(`${r2.base}/${key}`, {
      method: 'PUT',
      body,
      headers: { 'content-type': 'text/plain; charset=utf-8', 'content-encoding': 'gzip' },
    })
    if (!res.ok) throw new Error(`R2 PUT ${res.status}`)
    return { key, bytes: body.byteLength }
  } catch (err) {
    log.error({ err, key }, 'R2 upload failed')
    return null
  }
}
