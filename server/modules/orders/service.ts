import type { Pool } from 'pg'
import type { Redis } from 'ioredis'
import { upsertOrderFromMarket } from './repository.js'
import type { MockCollectOrderRequest } from './schemas.js'

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
