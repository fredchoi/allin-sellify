import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── 모듈 모킹 ──────────────────────────────────────────────────────────────

vi.mock('../repository.js', () => ({
  upsertOrderFromMarket: vi.fn(),
}))

vi.mock('../../../adapters/marketplace-adapter-factory.js', () => ({
  createMarketplaceAdapter: vi.fn(),
}))

import { upsertOrderFromMarket } from '../repository.js'
import { createMarketplaceAdapter } from '../../../adapters/marketplace-adapter-factory.js'
import { collectMockOrders, collectMarketOrders } from '../service.js'

const mockLog = {
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  debug: vi.fn(),
  fatal: vi.fn(),
  trace: vi.fn(),
  child: vi.fn().mockReturnThis(),
  level: 'info',
  silent: vi.fn(),
} as any

// ─────────────────────────────────────────────
// collectMockOrders 테스트
// ─────────────────────────────────────────────

describe('collectMockOrders', () => {
  const mockRedis = {
    set: vi.fn(),
    del: vi.fn(),
  } as any

  beforeEach(() => {
    vi.clearAllMocks()
    mockRedis.set.mockResolvedValue('OK')
    mockRedis.del.mockResolvedValue(1)
  })

  it('Redis NX Lock을 획득하고 주문을 생성한다', async () => {
    vi.mocked(upsertOrderFromMarket).mockResolvedValue({
      order: {
        id: 'order-uuid-001',
        seller_id: 'seller-001',
        marketplace: 'naver',
        market_order_id: 'MOCK-NAVER-001',
        order_status: 'new',
        buyer_name: '테스트구매자1',
        buyer_phone: '010-0000-0000',
        buyer_address: '서울시 강남구 테스트로 123',
        total_amount: 30000,
        commission_amount: 0,
        ordered_at: new Date(),
        metadata: {},
        created_at: new Date(),
        updated_at: new Date(),
      },
      isNew: true,
    })

    const result = await collectMockOrders({} as any, mockRedis, {
      sellerId: 'seller-001',
      marketplace: 'naver',
      count: 1,
    })

    expect(mockRedis.set).toHaveBeenCalledWith(
      expect.stringContaining('order-lock:naver:MOCK-NAVER'),
      '1',
      'EX',
      60,
      'NX'
    )
    expect(result.collected).toBe(1)
    expect(result.skipped).toBe(0)
  })

  it('Redis Lock 획득 실패 시 해당 주문을 건너뛴다', async () => {
    mockRedis.set.mockResolvedValue(null) // Lock 획득 실패

    const result = await collectMockOrders({} as any, mockRedis, {
      sellerId: 'seller-001',
      marketplace: 'naver',
      count: 3,
    })

    expect(result.skipped).toBe(3)
    expect(result.collected).toBe(0)
    expect(upsertOrderFromMarket).not.toHaveBeenCalled()
  })

  it('이미 존재하는 주문(isNew=false)은 skipped로 카운트한다', async () => {
    vi.mocked(upsertOrderFromMarket).mockResolvedValue({
      order: {
        id: 'order-uuid-existing',
        seller_id: 'seller-001',
        marketplace: 'coupang',
        market_order_id: 'MOCK-COUPANG-001',
        order_status: 'new',
        buyer_name: null,
        buyer_phone: null,
        buyer_address: null,
        total_amount: 20000,
        commission_amount: 0,
        ordered_at: null,
        metadata: {},
        created_at: new Date(),
        updated_at: new Date(),
      },
      isNew: false,
    })

    const result = await collectMockOrders({} as any, mockRedis, {
      sellerId: 'seller-001',
      marketplace: 'coupang',
      count: 2,
    })

    expect(result.skipped).toBe(2)
    expect(result.collected).toBe(0)
  })

  it('주문 처리 후 Redis Lock을 반드시 해제한다', async () => {
    vi.mocked(upsertOrderFromMarket).mockResolvedValue({
      order: {
        id: 'order-uuid-001',
        seller_id: 'seller-001',
        marketplace: 'naver',
        market_order_id: 'MOCK-NAVER-001',
        order_status: 'new',
        buyer_name: null,
        buyer_phone: null,
        buyer_address: null,
        total_amount: 15000,
        commission_amount: 0,
        ordered_at: null,
        metadata: {},
        created_at: new Date(),
        updated_at: new Date(),
      },
      isNew: true,
    })

    await collectMockOrders({} as any, mockRedis, {
      sellerId: 'seller-001',
      marketplace: 'naver',
      count: 1,
    })

    expect(mockRedis.del).toHaveBeenCalledWith(
      expect.stringContaining('order-lock:naver:MOCK-NAVER')
    )
  })

  it('여러 건의 주문을 순차적으로 처리한다', async () => {
    vi.mocked(upsertOrderFromMarket).mockResolvedValue({
      order: {} as any,
      isNew: true,
    })

    const result = await collectMockOrders({} as any, mockRedis, {
      sellerId: 'seller-001',
      marketplace: 'naver',
      count: 5,
    })

    expect(result.collected).toBe(5)
    expect(upsertOrderFromMarket).toHaveBeenCalledTimes(5)
  })
})

// ─────────────────────────────────────────────
// collectMarketOrders 테스트
// ─────────────────────────────────────────────

describe('collectMarketOrders', () => {
  const mockRedis = {
    set: vi.fn().mockResolvedValue('OK'),
    del: vi.fn().mockResolvedValue(1),
  } as any

  beforeEach(() => {
    vi.clearAllMocks()
    mockRedis.set.mockResolvedValue('OK')
  })

  it('마켓 어댑터를 통해 주문을 수집하고 DB에 저장한다', async () => {
    const mockAdapter = {
      name: 'naver' as const,
      createListing: vi.fn(),
      updateListing: vi.fn(),
      collectOrders: vi.fn().mockResolvedValue([
        {
          marketOrderId: 'NAVER-ORD-001',
          marketplace: 'naver',
          buyerName: '홍길동',
          buyerPhone: '010-1234-5678',
          buyerAddress: '서울시 종로구',
          totalAmount: 45000,
          commissionAmount: 1485,
          orderedAt: new Date('2026-03-15'),
          items: [
            {
              marketProductId: 'naver-pid-001',
              productName: '무선 이어폰',
              optionName: '블랙',
              quantity: 1,
              sellingPrice: 45000,
              commissionRate: 0.033,
            },
          ],
        },
      ]),
      uploadTracking: vi.fn(),
      getListingStatus: vi.fn(),
    }
    vi.mocked(createMarketplaceAdapter).mockReturnValue(mockAdapter)
    vi.mocked(upsertOrderFromMarket).mockResolvedValue({
      order: {} as any,
      isNew: true,
    })

    const result = await collectMarketOrders(
      {} as any,
      mockRedis,
      'seller-001',
      'naver',
      new Date('2026-03-01'),
      mockLog
    )

    expect(createMarketplaceAdapter).toHaveBeenCalledWith('naver')
    expect(mockAdapter.collectOrders).toHaveBeenCalledWith(new Date('2026-03-01'))
    expect(upsertOrderFromMarket).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        sellerId: 'seller-001',
        marketplace: 'naver',
        marketOrderId: 'NAVER-ORD-001',
        buyerName: '홍길동',
      })
    )
    expect(result.collected).toBe(1)
  })

  it('마켓에서 수집한 주문 아이템의 commissionRate가 없으면 기본값 0.033을 사용한다', async () => {
    const mockAdapter = {
      name: 'coupang' as const,
      createListing: vi.fn(),
      updateListing: vi.fn(),
      collectOrders: vi.fn().mockResolvedValue([
        {
          marketOrderId: 'COUPANG-ORD-001',
          marketplace: 'coupang',
          buyerName: '김철수',
          totalAmount: 30000,
          commissionAmount: 0,
          orderedAt: new Date(),
          items: [
            {
              marketProductId: 'cpg-001',
              productName: '텀블러',
              quantity: 2,
              sellingPrice: 15000,
              // commissionRate 없음
            },
          ],
        },
      ]),
      uploadTracking: vi.fn(),
      getListingStatus: vi.fn(),
    }
    vi.mocked(createMarketplaceAdapter).mockReturnValue(mockAdapter)
    vi.mocked(upsertOrderFromMarket).mockResolvedValue({
      order: {} as any,
      isNew: true,
    })

    await collectMarketOrders(
      {} as any,
      mockRedis,
      'seller-001',
      'coupang',
      new Date(),
      mockLog
    )

    expect(upsertOrderFromMarket).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        items: expect.arrayContaining([
          expect.objectContaining({ commissionRate: 0.033 }),
        ]),
      })
    )
  })
})
