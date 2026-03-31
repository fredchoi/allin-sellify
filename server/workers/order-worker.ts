// order-collect 워커: 네이버 스마트스토어 주문 자동 수집
//
//   ┌────────────────┐    ┌─────────────┐    ┌──────────────────┐
//   │ cron scheduler │───►│ BullMQ Queue │───►│ order worker     │
//   │ (5분 주기)      │    │ order-collect│    │ collectMarket    │
//   └────────────────┘    └─────────────┘    │ Orders()         │
//                                            └──────────────────┘

import { createWorker } from '../lib/queue.js'
import { collectMarketOrders } from '../modules/orders/service.js'
import type { Pool } from 'pg'
import type { Redis } from 'ioredis'

interface OrderCollectJobData {
  sellerId: string
  marketplace: 'naver' | 'coupang'
  since: string // ISO date string
}

export function startOrderWorker(db: Pool, redis: Redis) {
  const logger = {
    info: (...args: unknown[]) => console.info('[order-worker]', ...args),
    error: (...args: unknown[]) => console.error('[order-worker]', ...args),
    warn: (...args: unknown[]) => console.warn('[order-worker]', ...args),
    debug: (...args: unknown[]) => console.debug('[order-worker]', ...args),
    fatal: (...args: unknown[]) => console.error('[order-worker] FATAL', ...args),
    trace: (...args: unknown[]) => console.trace('[order-worker]', ...args),
    child: () => logger,
    silent: () => {},
    level: 'info',
  }

  const worker = createWorker<OrderCollectJobData>(
    'order-collect',
    async (job) => {
      const { sellerId, marketplace, since } = job.data
      const result = await collectMarketOrders(
        db,
        redis,
        sellerId,
        marketplace,
        new Date(since),
        logger as any,
      )
      return result
    },
    { concurrency: 2 }
  )

  worker.on('completed', (job, result) => {
    console.info(`[order-worker] 완료: ${job.id}`, result)
  })

  worker.on('failed', (job, err) => {
    console.error(`[order-worker] 실패: ${job?.id}`, err.message)
  })

  return worker
}
