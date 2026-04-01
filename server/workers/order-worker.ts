// order-collect 워커: 네이버 스마트스토어 주문 자동 수집
//
//   ┌────────────────┐    ┌──────────────┐    ┌──────────────────┐
//   │ cron scheduler │───►│ job_queue     │───►│ order worker     │
//   │ (5분 주기)      │    │ (PostgreSQL)  │    │ collectMarket    │
//   └────────────────┘    └──────────────┘    │ Orders()         │
//                                             └──────────────────┘

import { startJobProcessor } from '../lib/queue.js'
import { collectMarketOrders } from '../modules/orders/service.js'
import type { Pool } from 'pg'
import type { JobRow } from '../lib/queue.js'

export function startOrderWorker(db: Pool): { stop: () => void } {
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

  const processor = startJobProcessor(
    db,
    'order-collect',
    async (job: JobRow) => {
      const { sellerId, marketplace, since } = job.data as {
        sellerId: string
        marketplace: 'naver' | 'coupang'
        since: string
      }
      const result = await collectMarketOrders(
        db,
        sellerId,
        marketplace,
        new Date(since),
        logger as any,
      )

      console.info(JSON.stringify({
        level: 'info',
        worker: 'order-collect',
        event: 'completed',
        jobId: job.id,
        sellerId,
        marketplace,
        result,
        timestamp: new Date().toISOString(),
      }))
    },
    { pollIntervalMs: 30_000 },
  )

  return processor
}
