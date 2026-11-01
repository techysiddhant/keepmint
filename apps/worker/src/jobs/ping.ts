import type { Job } from 'pg-boss'

export type PingData = { from: string; sentAt: string }

/** Smoke-test job: proves the queue → worker path works end to end. */
export async function handlePing(jobs: Job<PingData>[]) {
  for (const job of jobs) {
    const lagMs = Date.now() - new Date(job.data.sentAt).getTime()
    console.log(`[ping] from ${job.data.from}, picked up after ${lagMs} ms (job ${job.id})`)
  }
}
