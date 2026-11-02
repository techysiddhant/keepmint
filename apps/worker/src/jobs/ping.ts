import type { Job } from 'pg-boss'
import { log } from '../logger'

export type PingData = { from: string; sentAt: string }

/** Smoke-test job: proves the queue → worker path works end to end. */
export async function handlePing(jobs: Job<PingData>[]) {
  for (const job of jobs) {
    const lagMs = Date.now() - new Date(job.data.sentAt).getTime()
    log.info({ jobId: job.id, from: job.data.from, lagMs }, 'ping received')
  }
}
