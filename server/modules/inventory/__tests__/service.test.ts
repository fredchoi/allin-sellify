import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── 모듈 모킹 ──────────────────────────────────────────────────────────────

vi.mock('../repository.js', () => ({
  getJobsDueForPoll: vi.fn(),
  markJobPolled: vi.fn().mockResolvedValue(undefined),
  recordInventorySnapshot: vi.fn().mockResolvedValue({
    id: 'snap-uuid-001',
    wholesale_product_id: 'wp-uuid-001',
    quantity: 50,
    price: 15000,
    supply_status: 'available',
    recorded_at: new Date('2026-03-01T00:00:00Z'),
  }),
}))

vi.mock('../../../adapters/wholesale-adapter-factory.js', () => ({
  createWholesaleAdapter: vi.fn().mockReturnValue({
    name: 'mock',
    syncProduct: vi.fn().mockResolvedValue({
      supplyStatus: 'available',
      stockQuantity: 50,
      price: 15000,
    }),
  }),
}))

vi.mock('../../../adapters/marketplace-adapter-factory.js', () => ({
  createMarketplaceAdapter: vi.fn().mockReturnValue({
    name: 'mock',
    updateListing: vi.fn().mockResolvedValue(undefined),
  }),
}))

vi.mock('../../../lib/queue.js', () => ({
  addJob: vi.fn().mockResolvedValue('job-id-001'),
}))

import { getJobsDueForPoll, markJobPolled, recordInventorySnapshot } from '../repository.js'
import { addJob } from '../../../lib/queue.js'
import { schedulePollJobs, processInventoryPoll } from '../service.js'

// ─────────────────────────────────────────────
// schedulePollJobs 테스트
// ─────────────────────────────────────────────

describe('schedulePollJobs', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('폴링 예정 작업을 조회하고 job_queue에 추가한다', async () => {
    vi.mocked(getJobsDueForPoll).mockResolvedValue([
      {
        id: 'job-uuid-001',
        wholesale_product_id: 'wp-uuid-001',
        tier: 'tier2' as const,
        last_polled_at: null,
        next_poll_at: null,
        poll_count: 0,
        last_error: null,
        status: 'active' as const,
        created_at: new Date('2026-01-01'),
        updated_at: new Date('2026-01-01'),
      },
      {
        id: 'job-uuid-002',
        wholesale_product_id: 'wp-uuid-002',
        tier: 'tier1' as const,
        last_polled_at: null,
        next_poll_at: null,
        poll_count: 0,
        last_error: null,
        status: 'active' as const,
        created_at: new Date('2026-01-01'),
        updated_at: new Date('2026-01-01'),
      },
    ])

    const queued = await schedulePollJobs({} as any)

    expect(queued).toBe(2)
    expect(addJob).toHaveBeenCalledTimes(2)
    expect(addJob).toHaveBeenCalledWith(
      expect.anything(),
      'inventory-sync',
      'poll-inventory',
      { jobId: 'job-uuid-001', wholesaleProductId: 'wp-uuid-001', tier: 'tier2' },
    )
  })

  it('폴링 예정 작업이 없으면 0을 반환한다', async () => {
    vi.mocked(getJobsDueForPoll).mockResolvedValue([])

    const queued = await schedulePollJobs({} as any)

    expect(queued).toBe(0)
    expect(addJob).not.toHaveBeenCalled()
  })

  it('각 작업에 고유한 데이터를 부여하여 중복 실행을 방지한다', async () => {
    vi.mocked(getJobsDueForPoll).mockResolvedValue([
      {
        id: 'job-uuid-003',
        wholesale_product_id: 'wp-uuid-003',
        tier: 'tier3' as const,
        last_polled_at: null,
        next_poll_at: null,
        poll_count: 5,
        last_error: null,
        status: 'active' as const,
        created_at: new Date('2026-01-01'),
        updated_at: new Date('2026-01-01'),
      },
    ])

    await schedulePollJobs({} as any)

    expect(addJob).toHaveBeenCalledWith(
      expect.anything(),
      'inventory-sync',
      'poll-inventory',
      { jobId: 'job-uuid-003', wholesaleProductId: 'wp-uuid-003', tier: 'tier3' },
    )
  })
})

// ─────────────────────────────────────────────
// processInventoryPoll 테스트
// ─────────────────────────────────────────────

describe('processInventoryPoll', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('도매 상품 재고를 조회하고 스냅샷을 기록한다', async () => {
    const mockDb = {
      query: vi.fn()
        .mockResolvedValueOnce({
          rows: [{ source: 'domeggook', source_product_id: 'DG-001', stock_quantity: 50, price: 15000, supply_status: 'available' }],
        })
        .mockResolvedValueOnce({ rows: [] }), // UPDATE wholesale_products
    } as any

    await processInventoryPoll(mockDb, 'job-001', 'wp-001', 'tier2')

    expect(mockDb.query).toHaveBeenCalledWith(
      expect.stringContaining('SELECT source'),
      ['wp-001']
    )
    expect(recordInventorySnapshot).toHaveBeenCalledWith(mockDb, {
      wholesaleProductId: 'wp-001',
      quantity: 50,
      price: 15000,
      supplyStatus: 'available',
    })
  })

  it('재고 5개 이하이면 tier1으로 자동 분류한다', async () => {
    const { createWholesaleAdapter } = await import('../../../adapters/wholesale-adapter-factory.js')
    vi.mocked(createWholesaleAdapter).mockReturnValue({
      name: 'mock',
      syncProduct: vi.fn().mockResolvedValue({ supplyStatus: 'available', stockQuantity: 3, price: 10000 }),
      searchProducts: vi.fn(),
      getProduct: vi.fn(),
    } as any)

    const mockDb = {
      query: vi.fn()
        .mockResolvedValueOnce({ rows: [{ source: 'domeggook', source_product_id: 'DG-001', stock_quantity: 10, price: 10000, supply_status: 'available' }] })
        .mockResolvedValueOnce({ rows: [] }),
    } as any

    await processInventoryPoll(mockDb, 'job-001', 'wp-001', 'tier2')

    expect(markJobPolled).toHaveBeenCalledWith(mockDb, 'job-001', 'tier1')
  })

  it('재고 충분하고 판매 가능이면 tier2로 분류한다', async () => {
    const { createWholesaleAdapter } = await import('../../../adapters/wholesale-adapter-factory.js')
    vi.mocked(createWholesaleAdapter).mockReturnValue({
      name: 'mock',
      syncProduct: vi.fn().mockResolvedValue({ supplyStatus: 'available', stockQuantity: 100, price: 20000 }),
      searchProducts: vi.fn(),
      getProduct: vi.fn(),
    } as any)

    const mockDb = {
      query: vi.fn()
        .mockResolvedValueOnce({ rows: [{ source: 'domeggook', source_product_id: 'DG-001', stock_quantity: 5, price: 10000, supply_status: 'available' }] })
        .mockResolvedValueOnce({ rows: [] }),
    } as any

    await processInventoryPoll(mockDb, 'job-001', 'wp-001', 'tier1')

    expect(markJobPolled).toHaveBeenCalledWith(mockDb, 'job-001', 'tier2')
  })

  it('공급 상태가 available이 아니면 tier3으로 분류한다', async () => {
    const { createWholesaleAdapter } = await import('../../../adapters/wholesale-adapter-factory.js')
    vi.mocked(createWholesaleAdapter).mockReturnValue({
      name: 'mock',
      syncProduct: vi.fn().mockResolvedValue({ supplyStatus: 'soldout', stockQuantity: 50, price: 15000 }),
      searchProducts: vi.fn(),
      getProduct: vi.fn(),
    } as any)

    const mockDb = {
      query: vi.fn()
        .mockResolvedValueOnce({ rows: [{ source: 'domeggook', source_product_id: 'DG-001', stock_quantity: 50, price: 15000, supply_status: 'available' }] })
        .mockResolvedValueOnce({ rows: [] }) // UPDATE wholesale_products
        .mockResolvedValueOnce({ rows: [] }) // SELECT listings (pauseMarketListings)
        .mockResolvedValueOnce({ rows: [] }) // SELECT affected sellers (stockout notification)
    } as any

    await processInventoryPoll(mockDb, 'job-001', 'wp-001', 'tier2')

    expect(markJobPolled).toHaveBeenCalledWith(mockDb, 'job-001', 'tier3')
  })

  it('상품이 존재하지 않으면 에러 메시지와 함께 폴링 완료 처리한다', async () => {
    const mockDb = {
      query: vi.fn().mockResolvedValue({ rows: [] }),
    } as any

    await processInventoryPoll(mockDb, 'job-001', 'wp-001', 'tier2')

    expect(markJobPolled).toHaveBeenCalledWith(
      mockDb,
      'job-001',
      'tier2',
      '상품을 찾을 수 없습니다'
    )
  })

  it('DB 쿼리 실패 시 에러 메시지를 기록하고 폴링 완료 처리한다', async () => {
    const mockDb = {
      query: vi.fn().mockRejectedValue(new Error('Connection refused')),
    } as any

    await processInventoryPoll(mockDb, 'job-001', 'wp-001', 'tier2')

    expect(markJobPolled).toHaveBeenCalledWith(
      mockDb,
      'job-001',
      'tier2',
      'Connection refused'
    )
  })
})
