import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── 모듈 모킹 ──────────────────────────────────────────────────────────────

vi.mock('../repository.js', () => ({
  upsertSettlement: vi.fn(),
  getFeeRuleAtTime: vi.fn(),
}))

import { upsertSettlement, getFeeRuleAtTime } from '../repository.js'
import { calculateSettlement } from '../service.js'

// ─────────────────────────────────────────────
// calculateSettlement 테스트
// ─────────────────────────────────────────────

describe('calculateSettlement', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(upsertSettlement).mockImplementation(async (_db, _req, totals) => ({
      id: 'stl-uuid-001',
      seller_id: 'seller-001',
      marketplace: 'naver',
      period_start: '2026-03-01',
      period_end: '2026-03-31',
      total_sales: totals.totalSales,
      total_commission: totals.totalCommission,
      total_wholesale: totals.totalWholesale,
      net_profit: totals.netProfit,
      settlement_status: 'pending',
      settled_at: null,
      details: totals.details,
      created_at: new Date(),
      updated_at: new Date(),
    }))
  })

  it('주문 아이템을 집계하여 매출/수수료/도매원가/순이익을 계산한다', async () => {
    const mockDb = {
      query: vi.fn().mockResolvedValue({
        rows: [
          {
            id: 'oi-001',
            selling_price: 29900,
            wholesale_price: 15000,
            quantity: 2,
            commission_rate: '0.033',
            ordered_at: new Date('2026-03-10'),
          },
          {
            id: 'oi-002',
            selling_price: 19900,
            wholesale_price: 8000,
            quantity: 1,
            commission_rate: '0.033',
            ordered_at: new Date('2026-03-15'),
          },
        ],
      }),
    } as any

    const result = await calculateSettlement(mockDb, {
      sellerId: 'seller-001',
      marketplace: 'naver',
      periodStart: '2026-03-01',
      periodEnd: '2026-03-31',
    })

    // 매출: (29900 * 2) + (19900 * 1) = 79700
    expect(result.total_sales).toBe(79700)
    // 도매원가: (15000 * 2) + (8000 * 1) = 38000
    expect(result.total_wholesale).toBe(38000)
    // 수수료: Math.round(59800 * 0.033) + Math.round(19900 * 0.033) = 1973 + 657 = 2630
    expect(result.total_commission).toBe(2630)
    // 순이익: 79700 - 2630 - 38000 = 39070
    expect(result.net_profit).toBe(39070)
  })

  it('아이템에 commission_rate가 없으면 market_fee_rules에서 조회한다', async () => {
    const mockDb = {
      query: vi.fn().mockResolvedValue({
        rows: [
          {
            id: 'oi-003',
            selling_price: 50000,
            wholesale_price: 25000,
            quantity: 1,
            commission_rate: null,
            ordered_at: new Date('2026-03-20'),
          },
        ],
      }),
    } as any

    vi.mocked(getFeeRuleAtTime).mockResolvedValue({
      id: 'fr-001',
      marketplace: 'coupang',
      category: null,
      fee_rate: '0.108',
      fee_type: 'percentage',
      effective_from: new Date('2026-01-01'),
      effective_to: null,
      created_at: new Date(),
    })

    const result = await calculateSettlement(mockDb, {
      sellerId: 'seller-001',
      marketplace: 'coupang',
      periodStart: '2026-03-01',
      periodEnd: '2026-03-31',
    })

    expect(getFeeRuleAtTime).toHaveBeenCalledWith(
      mockDb,
      'coupang',
      new Date('2026-03-20')
    )
    // 수수료: Math.round(50000 * 0.108) = 5400
    expect(result.total_commission).toBe(5400)
    // 순이익: 50000 - 5400 - 25000 = 19600
    expect(result.net_profit).toBe(19600)
  })

  it('수수료 규칙도 없으면 수수료율 0으로 처리한다', async () => {
    const mockDb = {
      query: vi.fn().mockResolvedValue({
        rows: [
          {
            id: 'oi-004',
            selling_price: 30000,
            wholesale_price: 15000,
            quantity: 1,
            commission_rate: null,
            ordered_at: new Date('2026-03-25'),
          },
        ],
      }),
    } as any

    vi.mocked(getFeeRuleAtTime).mockResolvedValue(null)

    const result = await calculateSettlement(mockDb, {
      sellerId: 'seller-001',
      marketplace: 'naver',
      periodStart: '2026-03-01',
      periodEnd: '2026-03-31',
    })

    expect(result.total_commission).toBe(0)
    expect(result.net_profit).toBe(15000) // 30000 - 0 - 15000
  })

  it('기간 내 주문이 없으면 모든 값이 0인 정산 레코드를 생성한다', async () => {
    const mockDb = {
      query: vi.fn().mockResolvedValue({ rows: [] }),
    } as any

    const result = await calculateSettlement(mockDb, {
      sellerId: 'seller-001',
      marketplace: 'naver',
      periodStart: '2026-04-01',
      periodEnd: '2026-04-30',
    })

    expect(result.total_sales).toBe(0)
    expect(result.total_commission).toBe(0)
    expect(result.total_wholesale).toBe(0)
    expect(result.net_profit).toBe(0)
  })

  it('upsertSettlement에 올바른 details를 전달한다', async () => {
    const mockDb = {
      query: vi.fn().mockResolvedValue({
        rows: [
          {
            id: 'oi-005',
            selling_price: 10000,
            wholesale_price: 5000,
            quantity: 3,
            commission_rate: '0.05',
            ordered_at: new Date('2026-03-10'),
          },
        ],
      }),
    } as any

    await calculateSettlement(mockDb, {
      sellerId: 'seller-001',
      marketplace: 'naver',
      periodStart: '2026-03-01',
      periodEnd: '2026-03-31',
    })

    expect(upsertSettlement).toHaveBeenCalledWith(
      mockDb,
      expect.objectContaining({
        sellerId: 'seller-001',
        marketplace: 'naver',
      }),
      expect.objectContaining({
        details: { itemCount: 1 },
      })
    )
  })

  it('쿼리에 올바른 셀러 ID, 마켓, 기간 조건을 전달한다', async () => {
    const mockDb = {
      query: vi.fn().mockResolvedValue({ rows: [] }),
    } as any

    await calculateSettlement(mockDb, {
      sellerId: 'seller-xyz',
      marketplace: 'coupang',
      periodStart: '2026-02-01',
      periodEnd: '2026-02-28',
    })

    expect(mockDb.query).toHaveBeenCalledWith(
      expect.stringContaining('WHERE o.seller_id = $1'),
      ['seller-xyz', 'coupang', '2026-02-01', '2026-02-28']
    )
  })
})
