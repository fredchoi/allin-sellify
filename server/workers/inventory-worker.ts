// inventory-sync 워커: 도매 재고 폴링 + 품절 시 마켓 판매중지
//
// BullMQ Worker가 'inventory-sync' 큐의 'poll-inventory' 잡을 처리
// schedulePollJobs()가 큐에 잡을 추가 → 이 워커가 실행
//
//   ┌────────────────┐    ┌─────────────┐    ┌──────────────────┐
//   │ schedulePollJobs│───►│ BullMQ Queue │───►│ inventory worker │
//   │ (cron trigger) │    │ inventory-   │    │ processInventory │
//   └────────────────┘    │ sync         │    │ Poll()           │
//                         └─────────────┘    └──────────────────┘

import { createWorker } from '../lib/queue.js'
import { processInventoryPoll } from '../modules/inventory/service.js'
import type { Pool } from 'pg'

interface InventoryJobData {
  jobId: string
  wholesaleProductId: string
  tier: string
}

export function startInventoryWorker(db: Pool) {
  const worker = createWorker<InventoryJobData>(
    'inventory-sync',
    async (job) => {
      const { jobId, wholesaleProductId, tier } = job.data
      await processInventoryPoll(db, jobId, wholesaleProductId, tier)
    },
    { concurrency: 3 }
  )

  worker.on('completed', (job) => {
    console.info(`[inventory-worker] 완료: ${job.id}`)
  })

  worker.on('failed', (job, err) => {
    console.error(`[inventory-worker] 실패: ${job?.id}`, err.message)
  })

  return worker
}
