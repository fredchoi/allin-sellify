import type { Pool } from 'pg'
import {
  getJobsDueForPoll,
  markJobPolled,
  recordInventorySnapshot,
} from './repository.js'
import { addJob } from '../../lib/queue.js'
import { createWholesaleAdapter } from '../../adapters/wholesale-adapter-factory.js'
import { createMarketplaceAdapter } from '../../adapters/marketplace-adapter-factory.js'
import { config } from '../../config.js'
import { appEvents, APP_EVENT_NOTIFY } from '../../lib/events.js'

export async function schedulePollJobs(db: Pool): Promise<number> {
  const jobs = await getJobsDueForPoll(db)
  let queued = 0

  for (const job of jobs) {
    await addJob(
      db,
      'inventory-sync',
      'poll-inventory',
      { jobId: job.id, wholesaleProductId: job.wholesale_product_id, tier: job.tier },
    )
    queued++
  }

  return queued
}

// 100ms batch delay 헬퍼 (도매꾹 쓰로틀링 방지)
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export async function processInventoryPoll(
  db: Pool,
  jobId: string,
  wholesaleProductId: string,
  tier: string
): Promise<void> {
  try {
    // 도매 상품의 source + source_product_id 조회
    const { rows } = await db.query<{
      source: string
      source_product_id: string
      stock_quantity: number
      price: number
      supply_status: string
    }>(
      `SELECT source, source_product_id, stock_quantity, price, supply_status
       FROM wholesale_products WHERE id = $1`,
      [wholesaleProductId]
    )

    if (!rows[0]) {
      await markJobPolled(db, jobId, tier, '상품을 찾을 수 없습니다')
      return
    }

    const product = rows[0]

    // 실제 도매 API로 재고 동기화 (데모 모드 시 mock 강제)
    const effectiveSource = config.DEMO_MODE === 'true' ? 'mock' : product.source as 'domeggook' | 'mock'
    const adapter = createWholesaleAdapter(effectiveSource)
    const latest = await adapter.syncProduct(product.source_product_id)

    // DB 업데이트
    await db.query(
      `UPDATE wholesale_products
       SET stock_quantity = $1, price = $2, supply_status = $3, last_synced_at = NOW()
       WHERE id = $4`,
      [latest.stockQuantity ?? 0, latest.price, latest.supplyStatus, wholesaleProductId]
    )

    // 스냅샷 기록
    await recordInventorySnapshot(db, {
      wholesaleProductId,
      quantity: latest.stockQuantity ?? 0,
      price: latest.price,
      supplyStatus: latest.supplyStatus,
    })

    // 품절 감지 -> 마켓 판매중지 자동화 + 셀러 알림
    if (latest.supplyStatus === 'soldout' && product.supply_status === 'available') {
      await pauseMarketListings(db, wholesaleProductId)

      // 영향 받는 셀러에게 품절 알림 전송
      const { rows: affectedSellers } = await db.query<{ seller_id: string }>(
        `SELECT DISTINCT pp.seller_id
         FROM processed_products pp
         WHERE pp.wholesale_product_id = $1`,
        [wholesaleProductId]
      )
      for (const { seller_id } of affectedSellers) {
        appEvents.emit(APP_EVENT_NOTIFY, {
          sellerId: seller_id,
          event: {
            type: 'stockout_detected' as const,
            data: { wholesaleProductId },
            timestamp: new Date().toISOString(),
          },
        })
      }
    }

    // Tier 자동 재분류
    const qty = latest.stockQuantity ?? 0
    const newTier = qty <= 5 ? 'tier1' : latest.supplyStatus === 'available' ? 'tier2' : 'tier3'
    await markJobPolled(db, jobId, newTier)

    // batch delay (도매꾹 쓰로틀링 방지)
    await delay(100)
  } catch (err) {
    const msg = err instanceof Error ? err.message : '알 수 없는 오류'
    await markJobPolled(db, jobId, tier, msg)
  }
}

// 품절 시 해당 도매 상품의 모든 마켓 등록을 중지
async function pauseMarketListings(db: Pool, wholesaleProductId: string): Promise<void> {
  // wholesale -> processed -> market_listings 경로 추적
  const { rows: listings } = await db.query<{
    id: string
    marketplace: string
    market_product_id: string
  }>(
    `SELECT pml.id, pml.marketplace, pml.market_product_id
     FROM product_market_listings pml
     JOIN processed_products pp ON pp.id = pml.processed_product_id
     WHERE pp.wholesale_product_id = $1
       AND pml.listing_status = 'active'`,
    [wholesaleProductId]
  )

  for (const listing of listings) {
    try {
      if (listing.market_product_id && listing.marketplace !== 'store') {
        const effectiveMarket = config.DEMO_MODE === 'true' ? 'mock' : listing.marketplace as 'naver' | 'coupang'
        const adapter = createMarketplaceAdapter(effectiveMarket)
        await adapter.updateListing(listing.market_product_id, {})
      }
      await db.query(
        `UPDATE product_market_listings SET listing_status = 'paused' WHERE id = $1`,
        [listing.id]
      )
    } catch {
      // 개별 listing 실패해도 계속 진행
    }
  }
}
