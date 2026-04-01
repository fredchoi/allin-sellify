import type { Pool } from 'pg'
import type { Redis } from 'ioredis'
import type { FastifyBaseLogger } from 'fastify'
import { upsertOrderFromMarket } from './repository.js'
import type { MockCollectOrderRequest } from './schemas.js'
import { createMarketplaceAdapter } from '../../adapters/marketplace-adapter-factory.js'
import type { MarketOrder } from '../../adapters/marketplace-adapter.js'
import { config } from '../../config.js'
import { appEvents, APP_EVENT_NOTIFY } from '../../lib/events.js'

// Redis NX Lock으로 중복 처리 방지
async function acquireLock(redis: Redis, key: string, ttlSeconds = 60): Promise<boolean> {
  const result = await redis.set(key, '1', 'EX', ttlSeconds, 'NX')
  return result === 'OK'
}

async function releaseLock(redis: Redis, key: string): Promise<void> {
  await redis.del(key)
}

export async function collectMockOrders(
  db: Pool,
  redis: Redis,
  req: MockCollectOrderRequest
): Promise<{ collected: number; skipped: number }> {
  let collected = 0
  let skipped = 0

  for (let i = 0; i < req.count; i++) {
    const marketOrderId = `MOCK-${req.marketplace.toUpperCase()}-${Date.now()}-${i}`
    const lockKey = `order-lock:${req.marketplace}:${marketOrderId}`

    const acquired = await acquireLock(redis, lockKey)
    if (!acquired) {
      skipped++
      continue
    }

    try {
      const { isNew } = await upsertOrderFromMarket(db, {
        sellerId: req.sellerId,
        marketplace: req.marketplace,
        marketOrderId,
        buyerName: `테스트구매자${i + 1}`,
        buyerPhone: '010-0000-0000',
        buyerAddress: '서울시 강남구 테스트로 123',
        totalAmount: Math.floor(Math.random() * 50000) + 10000,
        commissionAmount: 0,
        orderedAt: new Date(),
        items: [
          {
            productName: `테스트상품${i + 1}`,
            optionName: '기본',
            quantity: 1,
            sellingPrice: Math.floor(Math.random() * 50000) + 10000,
            wholesalePrice: Math.floor(Math.random() * 20000) + 5000,
            commissionRate: 0.033,
          },
        ],
      })
      if (isNew) collected++
      else skipped++
    } finally {
      await releaseLock(redis, lockKey)
    }
  }

  return { collected, skipped }
}

// ── 마켓 주문 자동 수집 (MarketplaceAdapter) ───────────────────────────

export async function collectMarketOrders(
  db: Pool,
  redis: Redis,
  sellerId: string,
  marketplace: 'naver' | 'coupang',
  since: Date,
  log: FastifyBaseLogger,
): Promise<{ collected: number; skipped: number }> {
  const effectiveMarket = config.DEMO_MODE === 'true' ? 'mock' : marketplace
  const adapter = createMarketplaceAdapter(effectiveMarket)
  const orders = await adapter.collectOrders(since)
  log.info({ marketplace: effectiveMarket, count: orders.length, demo: config.DEMO_MODE === 'true' }, '마켓 주문 수집 완료')

  let collected = 0
  let skipped = 0

  for (const order of orders) {
    const lockKey = `order-lock:${marketplace}:${order.marketOrderId}`
    const acquired = await acquireLock(redis, lockKey)
    if (!acquired) {
      skipped++
      continue
    }

    try {
      const { isNew } = await upsertOrderFromMarket(db, {
        sellerId,
        marketplace,
        marketOrderId: order.marketOrderId,
        buyerName: order.buyerName,
        buyerPhone: order.buyerPhone,
        buyerAddress: order.buyerAddress,
        totalAmount: order.totalAmount,
        commissionAmount: order.commissionAmount,
        orderedAt: order.orderedAt,
        items: await Promise.all(order.items.map(async (item) => {
          // 도매 원가 조회: market_product_id → listing → processed → wholesale
          let wholesalePrice = 0
          if (item.marketProductId) {
            const wpResult = await db.query<{ price: number }>(
              `SELECT wp.price FROM product_market_listings pml
               JOIN processed_products pp ON pp.id = pml.processed_product_id
               JOIN wholesale_products wp ON wp.id = pp.wholesale_product_id
               WHERE pml.market_product_id = $1 LIMIT 1`,
              [item.marketProductId]
            )
            if (wpResult.rows[0]) wholesalePrice = wpResult.rows[0].price
          }
          return {
            productName: item.productName,
            optionName: item.optionName,
            quantity: item.quantity,
            sellingPrice: item.sellingPrice,
            wholesalePrice,
            commissionRate: item.commissionRate ?? 0.033,
          }
        })),
      })
      if (isNew) collected++
      else skipped++
    } finally {
      await releaseLock(redis, lockKey)
    }
  }

  log.info({ marketplace, collected, skipped }, '주문 DB 저장 완료')

  // 새 주문이 있으면 셀러에게 실시간 알림
  if (collected > 0) {
    appEvents.emit(APP_EVENT_NOTIFY, {
      sellerId,
      event: {
        type: 'order_received' as const,
        data: { marketplace, collected, skipped },
        timestamp: new Date().toISOString(),
      },
    })
  }

  return { collected, skipped }
}
