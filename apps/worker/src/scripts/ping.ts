import { QUEUES } from '@keepmint/core'
import { createBoss } from '../boss'

// Sends one ping job. Run with the worker up: `pnpm --filter @keepmint/worker ping`.
const boss = createBoss('producer')
await boss.start()
const id = await boss.send(QUEUES.ping, { from: 'ping script', sentAt: new Date().toISOString() })
console.log(`sent ping job ${id}`)
await boss.stop({ graceful: false })
