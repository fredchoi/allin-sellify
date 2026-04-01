import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../../adapters/marketplace-adapter-factory.js', () => ({
  createMarketplaceAdapter: vi.fn().mockReturnValue({
    name: 'mock',
    collectOrders: vi.fn().mockResolvedValue([
      {
        marketOrderId: 'ORD-001',
        marketplace: 'naver',
        buyerName: '김구매',
        buyerPhone: '010-1234-5678',
        buyerAddress: '서울시 강남구',
        totalAmount: 35000,
        commissionAmount: 1155,
        orderedAt: new Date('2026-03-31T10:00:00Z'),
        items: [
          {
            marketProductId: 'NV-001',
            productName: '실리콘 주방 도구',
            quantity: 1,
            sellingPrice: 35000,
            commissionRate: 0.033,
          },
        ],
      },
    ]),
  }),
}))

vi.mock('../../modules/orders/repository.js', () => ({
  upsertOrderFromMarket: vi.fn().mockResolvedValue({ isNew: true }),
}))

vi.mock('../../lib/queue.js', () => ({
  acquireLock: vi.fn().mockResolvedValue(true),
  releaseLock: vi.fn().mockResolvedValue(undefined),
}))

import { collectMarketOrders } from '../../modules/orders/service.js'
import { upsertOrderFromMarket } from '../../modules/orders/repository.js'
import { acquireLock } from '../../lib/queue.js'

const mockDb = {
  query: vi.fn().mockResolvedValue({ rows: [{ price: 12000 }] }),
} as any

const mockLog = {
  info: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
  debug: vi.fn(),
  fatal: vi.fn(),
  trace: vi.fn(),
  child: vi.fn().mockReturnThis(),
  silent: vi.fn(),
  level: 'info',
} as any

beforeEach(() => {
  vi.clearAllMocks()
  mockDb.query.mockResolvedValue({ rows: [{ price: 12000 }] })
  vi.mocked(acquireLock).mockResolvedValue(true)
})

describe('collectMarketOrders', () => {
  it('마켓에서 주문을 수집하고 DB에 저장한다', async () => {
    const result = await collectMarketOrders(
      mockDb, 'seller-1', 'naver', new Date('2026-03-31'), mockLog
    )

    expect(result.collected).toBe(1)
    expect(result.skipped).toBe(0)
    expect(upsertOrderFromMarket).toHaveBeenCalledWith(mockDb, expect.objectContaining({
      sellerId: 'seller-1',
      marketplace: 'naver',
      marketOrderId: 'ORD-001',
      buyerName: '김구매',
    }))
  })

  it('분산 락 획득 실패 시 스킵한다', async () => {
    vi.mocked(acquireLock).mockResolvedValue(false)

    const result = await collectMarketOrders(
      mockDb, 'seller-1', 'naver', new Date('2026-03-31'), mockLog
    )

    expect(result.collected).toBe(0)
    expect(result.skipped).toBe(1)
    expect(upsertOrderFromMarket).not.toHaveBeenCalled()
  })

  it('중복 주문은 스킵으로 카운트한다', async () => {
    vi.mocked(upsertOrderFromMarket).mockResolvedValueOnce({ isNew: false })

    const result = await collectMarketOrders(
      mockDb, 'seller-1', 'naver', new Date('2026-03-31'), mockLog
    )

    expect(result.collected).toBe(0)
    expect(result.skipped).toBe(1)
  })
})
