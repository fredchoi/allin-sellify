import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── 의존성 모킹 ──

vi.mock('../../adapters/wholesale-adapter-factory.js', () => ({
  createWholesaleAdapter: vi.fn().mockReturnValue({
    name: 'mock',
    syncProduct: vi.fn().mockResolvedValue({
      supplyStatus: 'available',
      stockQuantity: 50,
      price: 15000,
    }),
  }),
}))

vi.mock('../../adapters/marketplace-adapter-factory.js', () => ({
  createMarketplaceAdapter: vi.fn().mockReturnValue({
    name: 'mock',
    updateListing: vi.fn().mockResolvedValue(undefined),
  }),
}))

vi.mock('../../modules/inventory/repository.js', () => ({
  getJobsDueForPoll: vi.fn().mockResolvedValue([]),
  markJobPolled: vi.fn().mockResolvedValue(undefined),
  recordInventorySnapshot: vi.fn().mockResolvedValue(undefined),
}))

import { processInventoryPoll, schedulePollJobs } from '../../modules/inventory/service.js'
import { createWholesaleAdapter } from '../../adapters/wholesale-adapter-factory.js'
import { markJobPolled, recordInventorySnapshot } from '../../modules/inventory/repository.js'

const mockDb = {
  query: vi.fn(),
} as any

beforeEach(() => {
  vi.clearAllMocks()
})

describe('processInventoryPoll', () => {
  it('도매 API를 호출하여 재고를 동기화한다', async () => {
    mockDb.query
      .mockResolvedValueOnce({
        rows: [{ source: 'domeggook', source_product_id: 'DG-001', stock_quantity: 10, price: 10000, supply_status: 'available' }],
      })
      .mockResolvedValueOnce({ rows: [] }) // UPDATE wholesale_products

    await processInventoryPoll(mockDb, 'job-1', 'wp-uuid-1', 'tier2')

    expect(createWholesaleAdapter).toHaveBeenCalledWith('domeggook')
    expect(recordInventorySnapshot).toHaveBeenCalledWith(mockDb, expect.objectContaining({
      wholesaleProductId: 'wp-uuid-1',
      quantity: 50,
      price: 15000,
    }))
    expect(markJobPolled).toHaveBeenCalledWith(mockDb, 'job-1', 'tier2')
  })

  it('품절 감지 시 마켓 리스팅을 중지한다', async () => {
    const syncMock = vi.fn().mockResolvedValue({
      supplyStatus: 'soldout',
      stockQuantity: 0,
      price: 15000,
    })
    vi.mocked(createWholesaleAdapter).mockReturnValue({
      name: 'mock' as any,
      syncProduct: syncMock,
      searchProducts: vi.fn(),
      getProduct: vi.fn(),
    } as any)

    // 순서: SELECT → UPDATE → snapshot → SELECT listings → UPDATE listing → SELECT affected sellers
    mockDb.query
      .mockResolvedValueOnce({
        rows: [{ source: 'domeggook', source_product_id: 'DG-001', stock_quantity: 10, price: 10000, supply_status: 'available' }],
      })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({
        rows: [{ id: 'pml-1', marketplace: 'naver', market_product_id: 'NV-001' }],
      })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ seller_id: 'seller-1' }] })

    await processInventoryPoll(mockDb, 'job-1', 'wp-uuid-1', 'tier2')

    // 품절 + 재고 0 → qty <= 5 → tier1
    expect(markJobPolled).toHaveBeenCalledWith(mockDb, 'job-1', 'tier1')
    // pauseMarketListings가 호출되었는지 (listing status UPDATE 쿼리)
    expect(mockDb.query).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE product_market_listings'),
      ['pml-1']
    )
  })

  it('상품을 찾을 수 없으면 에러를 기록한다', async () => {
    mockDb.query.mockResolvedValueOnce({ rows: [] })

    await processInventoryPoll(mockDb, 'job-1', 'wp-nonexist', 'tier2')

    expect(markJobPolled).toHaveBeenCalledWith(mockDb, 'job-1', 'tier2', '상품을 찾을 수 없습니다')
  })

  it('API 실패 시 에러 메시지와 함께 마킹한다', async () => {
    const syncMock = vi.fn().mockRejectedValue(new Error('API timeout'))
    vi.mocked(createWholesaleAdapter).mockReturnValue({
      name: 'mock',
      syncProduct: syncMock,
      searchProducts: vi.fn(),
      getProduct: vi.fn(),
    } as any)

    mockDb.query.mockResolvedValueOnce({
      rows: [{ source: 'domeggook', source_product_id: 'DG-001', stock_quantity: 10, price: 10000, supply_status: 'available' }],
    })

    await processInventoryPoll(mockDb, 'job-1', 'wp-uuid-1', 'tier2')

    expect(markJobPolled).toHaveBeenCalledWith(mockDb, 'job-1', 'tier2', 'API timeout')
  })
})
