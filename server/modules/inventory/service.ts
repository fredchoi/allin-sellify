import type { Pool } from 'pg'
import type { Queue } from 'bullmq'
import {
  getJobsDueForPoll,
  markJobPolled,
  recordInventorySnapshot,
} from './repository.js'

export async function schedulePollJobs(db: Pool, queue: Queue): Promise<number> {
  const jobs = await getJobsDueForPoll(db)
  let queued = 0

  for (const job of jobs) {
    await queue.add(
      'poll-inventory',
      { jobId: job.id, wholesaleProductId: job.wholesale_product_id, tier: job.tier },
      { jobId: `inv-${job.id}`, removeOnComplete: 100, removeOnFail: 50 }
    )
    queued++
  }

  return queued
}

export async function processInventoryPoll(
  db: Pool,
  jobId: string,
  wholesaleProductId: string,
  tier: string
): Promise<void> {
  try {
    // Mock: 실제 도매 API 호출 대신 현재 DB 값 재기록
    const { rows } = await db.query<{ stock_quantity: number; price: number; supply_status: string }>(
      `SELECT stock_quantity, price, supply_status FROM wholesale_products WHERE id = $1`,
      [wholesaleProductId]
    )
    if (rows[0]) {
      await recordInventorySnapshot(db, {
        wholesaleProductId,
        quantity: rows[0].stock_quantity ?? 0,
        price: rows[0].price,
        supplyStatus: rows[0].supply_status,
      })

      // Tier 자동 재분류
      const qty = rows[0].stock_quantity ?? 0
      const newTier = qty <= 5 ? 'tier1' : rows[0].supply_status === 'available' ? 'tier2' : 'tier3'
      await markJobPolled(db, jobId, newTier)
    } else {
      await markJobPolled(db, jobId, tier, '상품을 찾을 수 없습니다')
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : '알 수 없는 오류'
    await markJobPolled(db, jobId, tier, msg)
  }
}
