// inventory-sync 워커: 도매 재고 폴링 + 품절 시 마켓 판매중지
//
// PostgreSQL job_queue 테이블을 10초 간격으로 폴링하여
// 'inventory-sync' 큐의 'poll-inventory' 작업을 처리합니다.
//
//   ┌────────────────┐    ┌──────────────┐    ┌──────────────────┐
//   │ schedulePollJobs│───►│ job_queue     │───►│ inventory worker │
//   │ (cron trigger) │    │ (PostgreSQL)  │    │ processInventory │
//   └────────────────┘    └──────────────┘    │ Poll()           │
//                                             └──────────────────┘

import { startJobProcessor } from '../lib/queue.js'
import { processInventoryPoll } from '../modules/inventory/service.js'
import type { Pool } from 'pg'
import type { JobRow } from '../lib/queue.js'

export function startInventoryWorker(db: Pool): { stop: () => void } {
  const processor = startJobProcessor(
    db,
    'inventory-sync',
    async (job: JobRow) => {
      const { jobId, wholesaleProductId, tier } = job.data as {
        jobId: string
        wholesaleProductId: string
        tier: string
      }
      await processInventoryPoll(db, jobId, wholesaleProductId, tier)

      console.info(JSON.stringify({
        level: 'info',
        worker: 'inventory-sync',
        event: 'completed',
        jobId: job.id,
        wholesaleProductId,
        tier,
        timestamp: new Date().toISOString(),
      }))
    },
    { pollIntervalMs: 10_000 },
  )

  return processor
}
