import { describe, it, expect, vi, beforeEach } from 'vitest'
import { MarketplaceMockAdapter } from '../marketplace-mock-adapter.js'
import type { MarketListingInput } from '../marketplace-adapter.js'

// ─────────────────────────────────────────────
// MarketplaceMockAdapter + NaverSmartStoreAdapter 단위 테스트
// ─────────────────────────────────────────────

const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

function jsonResponse(data: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(data),
    text: () => Promise.resolve(JSON.stringify(data)),
  } as unknown as Response
}

// config 모킹 (SmartStore 어댑터용)
vi.mock('../../config.js', () => ({
  config: {},
}))

const sampleInput: MarketListingInput = {
  processedProductId: 'proc-001',
  title: '프리미엄 실리콘 주방 도구 5종 세트',
  price: 35000,
  description: '최고급 실리콘 소재의 주방 도구 세트입니다.',
  images: ['https://img.test/main.jpg', 'https://img.test/sub1.jpg'],
  options: [{ name: '색상', values: ['그레이', '화이트'] }],
  categoryId: '50000803',
}

// ═════════════════════════════════════════════
// MarketplaceMockAdapter
// ═════════════════════════════════════════════

describe('MarketplaceMockAdapter', () => {
  let adapter: MarketplaceMockAdapter

  beforeEach(() => {
    adapter = new MarketplaceMockAdapter()
  })

  it('name이 "mock"이다', () => {
    expect(adapter.name).toBe('mock')
  })

  describe('createListing', () => {
    it('상품 등록 후 marketProductId와 listingUrl을 반환한다', async () => {
      const result = await adapter.createListing(sampleInput)

      expect(result.marketProductId).toMatch(/^MOCK-PROD-/)
      expect(result.listingUrl).toContain(result.marketProductId)
      expect(result.status).toBe('active')
    })
  })

  describe('updateListing', () => {
    it('등록된 상품을 수정할 수 있다', async () => {
      const { marketProductId } = await adapter.createListing(sampleInput)

      // 가격 수정이 에러 없이 실행된다
      await expect(
        adapter.updateListing(marketProductId, { price: 29000 })
      ).resolves.toBeUndefined()
    })

    it('존재하지 않는 상품 수정 시 에러를 던진다', async () => {
      await expect(
        adapter.updateListing('NONEXISTENT', { price: 10000 })
      ).rejects.toThrow('상품을 찾을 수 없습니다')
    })
  })

  describe('collectOrders', () => {
    it('since 이후의 주문만 필터링한다', async () => {
      // 모든 MOCK 주문을 가져오는 시간대 (1시간 전 ~ 2시간 전 생성)
      const orders = await adapter.collectOrders(new Date(Date.now() - 3 * 3600_000))
      expect(orders.length).toBeGreaterThanOrEqual(2)
    })

    it('미래 시각으로 필터링하면 빈 배열을 반환한다', async () => {
      const orders = await adapter.collectOrders(new Date(Date.now() + 3600_000))
      expect(orders).toEqual([])
    })

    it('주문 데이터에 필수 필드가 포함된다', async () => {
      const orders = await adapter.collectOrders(new Date(0))
      expect(orders.length).toBeGreaterThan(0)
      const order = orders[0]
      expect(order).toHaveProperty('marketOrderId')
      expect(order).toHaveProperty('marketplace', 'naver')
      expect(order).toHaveProperty('buyerName')
      expect(order).toHaveProperty('totalAmount')
      expect(order).toHaveProperty('items')
      expect(order.items.length).toBeGreaterThan(0)
    })
  })

  describe('uploadTracking', () => {
    it('송장 업로드가 에러 없이 실행된다', async () => {
      await expect(
        adapter.uploadTracking('MOCK-ORD-001', { carrier: 'CJ', trackingNumber: '1234567890' })
      ).resolves.toBeUndefined()
    })
  })

  describe('getListingStatus', () => {
    it('등록된 상품은 active 상태를 반환한다', async () => {
      const { marketProductId } = await adapter.createListing(sampleInput)
      const status = await adapter.getListingStatus(marketProductId)

      expect(status.marketProductId).toBe(marketProductId)
      expect(status.status).toBe('active')
    })

    it('등록되지 않은 상품은 unknown 상태를 반환한다', async () => {
      const status = await adapter.getListingStatus('NOT-EXISTS')
      expect(status.status).toBe('unknown')
    })
  })
})

// ═════════════════════════════════════════════
// NaverSmartStoreAdapter
// ═════════════════════════════════════════════

// 동적 import — config 모킹 후에 불러온다
const { NaverSmartStoreAdapter } = await import('../naver-smartstore-adapter.js')

describe('NaverSmartStoreAdapter', () => {
  let adapter: InstanceType<typeof NaverSmartStoreAdapter>

  // OAuth 토큰 응답 헬퍼
  function mockTokenResponse(): void {
    mockFetch.mockResolvedValueOnce(jsonResponse({
      access_token: 'test-access-token',
      expires_in: 3600,
      token_type: 'Bearer',
    }))
  }

  beforeEach(() => {
    vi.clearAllMocks()
    adapter = new NaverSmartStoreAdapter('test-client-id', 'test-client-secret')
  })

  it('name이 "naver"이다', () => {
    expect(adapter.name).toBe('naver')
  })

  // ── OAuth 토큰 ──────────────────────────────────────────

  describe('OAuth 토큰 관리', () => {
    it('첫 요청 시 토큰을 발급받는다', async () => {
      mockTokenResponse()
      mockFetch.mockResolvedValueOnce(jsonResponse({
        originProductNo: 'PN-001',
        smartstoreChannelProductNo: 'SN-001',
      }))

      await adapter.createListing(sampleInput)

      // 첫 호출: 토큰 발급, 두 번째 호출: 상품 등록
      expect(mockFetch).toHaveBeenCalledTimes(2)
      const tokenCall = mockFetch.mock.calls[0]
      expect(tokenCall[0]).toContain('/v1/oauth2/token')
    })

    it('토큰 발급 요청에 HMAC 서명이 포함된다', async () => {
      mockTokenResponse()
      mockFetch.mockResolvedValueOnce(jsonResponse({
        originProductNo: 'PN-001',
        smartstoreChannelProductNo: 'SN-001',
      }))

      await adapter.createListing(sampleInput)

      const tokenCallBody = mockFetch.mock.calls[0][1].body as string
      expect(tokenCallBody).toContain('client_secret_sign=')
      expect(tokenCallBody).toContain('grant_type=client_credentials')
    })
  })

  // ── createListing ───────────────────────────────────────

  describe('createListing', () => {
    it('상품 등록 payload가 네이버 API 형식에 맞게 구성된다', async () => {
      mockTokenResponse()
      mockFetch.mockResolvedValueOnce(jsonResponse({
        originProductNo: 'PN-001',
        smartstoreChannelProductNo: 'SN-001',
      }))

      const result = await adapter.createListing(sampleInput)

      // 상품 등록 요청 확인
      const [url, options] = mockFetch.mock.calls[1]
      const body = JSON.parse(options.body)

      expect(url).toContain('/v2/products')
      expect(options.method).toBe('POST')
      expect(body.originProduct.name).toBe('프리미엄 실리콘 주방 도구 5종 세트')
      expect(body.originProduct.salePrice).toBe(35000)
      expect(body.originProduct.images.representativeImage.url).toBe('https://img.test/main.jpg')
      expect(body.smartstoreChannelProduct.naverShoppingRegistration).toBe(true)

      expect(result).toEqual({
        marketProductId: 'PN-001',
        listingUrl: 'https://smartstore.naver.com/products/SN-001',
        status: 'active',
      })
    })
  })

  // ── collectOrders ───────────────────────────────────────

  describe('collectOrders', () => {
    it('주문 응답을 MarketOrder로 올바르게 매핑한다', async () => {
      mockTokenResponse()
      mockFetch.mockResolvedValueOnce(jsonResponse({
        data: {
          contents: [
            {
              orderId: 'NAVER-ORD-001',
              buyerName: '김구매',
              buyerTel: '010-1234-5678',
              shippingAddress: { baseAddress: '서울시 강남구' },
              paymentAmount: 35000,
              commissionAmount: 1155,
              orderDate: '2025-06-01T10:00:00Z',
              productOrderDetails: [
                {
                  productId: 'PROD-001',
                  productName: '테스트 상품',
                  optionContent: '그레이',
                  quantity: 2,
                  totalPaymentAmount: 35000,
                  commissionRate: 0.033,
                },
              ],
            },
          ],
        },
      }))

      const orders = await adapter.collectOrders(new Date('2025-06-01'))

      expect(orders).toHaveLength(1)
      expect(orders[0]).toMatchObject({
        marketOrderId: 'NAVER-ORD-001',
        marketplace: 'naver',
        buyerName: '김구매',
        buyerPhone: '010-1234-5678',
        buyerAddress: '서울시 강남구',
        totalAmount: 35000,
        commissionAmount: 1155,
      })
      expect(orders[0].items).toHaveLength(1)
      expect(orders[0].items[0]).toMatchObject({
        marketProductId: 'PROD-001',
        productName: '테스트 상품',
        optionName: '그레이',
        quantity: 2,
        sellingPrice: 35000,
        commissionRate: 0.033,
      })
    })
  })

  // ── getListingStatus ────────────────────────────────────

  describe('getListingStatus', () => {
    it('상태를 올바르게 매핑한다 (SALE → active)', async () => {
      mockTokenResponse()
      mockFetch.mockResolvedValueOnce(jsonResponse({
        originProduct: { statusType: 'SALE' },
      }))

      const status = await adapter.getListingStatus('PN-001')
      expect(status).toEqual({ marketProductId: 'PN-001', status: 'active' })
    })

    it('알 수 없는 상태는 unknown으로 매핑한다', async () => {
      mockTokenResponse()
      mockFetch.mockResolvedValueOnce(jsonResponse({
        originProduct: { statusType: 'SOMETHING_ELSE' },
      }))

      const status = await adapter.getListingStatus('PN-002')
      expect(status.status).toBe('unknown')
    })
  })

  // ── 에러 처리 ───────────────────────────────────────────

  describe('에러 처리', () => {
    it('토큰 발급 실패 시 에러를 던진다', async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse({ error: 'invalid_client' }, 401))

      await expect(adapter.createListing(sampleInput)).rejects.toThrow('네이버 OAuth 토큰 발급 실패')
    })

    it('API 요청 실패 시 에러를 던진다', async () => {
      mockTokenResponse()
      mockFetch.mockResolvedValueOnce(jsonResponse({ error: 'Bad Request' }, 400))

      await expect(adapter.createListing(sampleInput)).rejects.toThrow('네이버 API 오류')
    })
  })
})
