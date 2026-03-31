import { describe, it, expect, vi, beforeEach } from 'vitest'
import { DomeggookAdapter } from '../domeggook-adapter.js'

// ─────────────────────────────────────────────
// DomeggookAdapter 단위 테스트
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

describe('DomeggookAdapter', () => {
  let adapter: DomeggookAdapter

  beforeEach(() => {
    vi.clearAllMocks()
    adapter = new DomeggookAdapter('test-api-key', 'https://domeggook.test/api/')
  })

  // ── 생성자 ──────────────────────────────────────────────

  describe('생성자', () => {
    it('API 키가 없으면 에러를 던진다', () => {
      expect(() => new DomeggookAdapter('')).toThrow('DOMEGGOOK_API_KEY가 필요합니다')
    })

    it('name이 "domeggook"이다', () => {
      expect(adapter.name).toBe('domeggook')
    })
  })

  // ── searchProducts ──────────────────────────────────────

  describe('searchProducts', () => {
    it('API 응답을 도메인 모델로 올바르게 매핑한다', async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse({
        list: [
          {
            no: '12345',
            goods_nm: '프리미엄 실리콘 주방 세트',
            price: '15000',
            cate_nm: '주방용품',
            img_url: 'https://img.test/item.jpg',
            option_items: '빨강|파랑|초록',
            soldout_yn: 'N',
            stock_qty: '100',
          },
        ],
        total_cnt: '1',
      }))

      const result = await adapter.searchProducts({ keyword: '주방' })

      expect(result.products).toHaveLength(1)
      expect(result.products[0]).toMatchObject({
        sourceProductId: '12345',
        name: '프리미엄 실리콘 주방 세트',
        price: 15000,
        category: '주방용품',
        images: ['https://img.test/item.jpg'],
        supplyStatus: 'available',
        stockQuantity: 100,
      })
      expect(result.products[0].options).toEqual([
        { name: '옵션', values: ['빨강', '파랑', '초록'] },
      ])
    })

    it('페이지네이션 정보를 올바르게 반환한다', async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse({
        list: [{ no: '1', goods_nm: '상품1', price: '1000' }],
        total_cnt: '50',
      }))

      const result = await adapter.searchProducts({ page: 2, pageSize: 10 })

      expect(result.page).toBe(2)
      expect(result.pageSize).toBe(10)
      expect(result.total).toBe(50)
      expect(result.hasMore).toBe(true) // 2*10=20 < 50
    })

    it('키워드 파라미터가 URL에 포함된다', async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse({ list: [], total_cnt: '0' }))

      await adapter.searchProducts({ keyword: '무선이어폰' })

      const calledUrl = mockFetch.mock.calls[0][0] as string
      expect(calledUrl).toContain('keyword=%EB%AC%B4%EC%84%A0%EC%9D%B4%EC%96%B4%ED%8F%B0')
    })

    it('품절 상품은 supplyStatus가 soldout이다', async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse({
        list: [{ no: '999', goods_nm: '품절 상품', price: '5000', soldout_yn: 'Y' }],
        total_cnt: '1',
      }))

      const result = await adapter.searchProducts({})
      expect(result.products[0].supplyStatus).toBe('soldout')
    })

    it('빈 목록에 대해 빈 배열을 반환한다', async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse({ list: [], total_cnt: '0' }))

      const result = await adapter.searchProducts({})
      expect(result.products).toEqual([])
      expect(result.total).toBe(0)
      expect(result.hasMore).toBe(false)
    })
  })

  // ── getProduct ──────────────────────────────────────────

  describe('getProduct', () => {
    it('상품 ID로 단일 상품을 반환한다', async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse({
        goods: {
          no: '12345',
          goods_nm: '테스트 상품',
          price: '25000',
          img_url: 'https://img.test/product.jpg',
          soldout_yn: 'N',
        },
      }))

      const product = await adapter.getProduct('12345')

      expect(product).not.toBeNull()
      expect(product!.sourceProductId).toBe('12345')
      expect(product!.name).toBe('테스트 상품')
      expect(product!.price).toBe(25000)
    })

    it('존재하지 않는 상품에 대해 null을 반환한다', async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse({ goods: null }))

      const product = await adapter.getProduct('nonexistent')
      expect(product).toBeNull()
    })

    it('API 오류 시 null을 반환한다 (catch 블록)', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      const product = await adapter.getProduct('12345')
      expect(product).toBeNull()
    })
  })

  // ── syncProduct ─────────────────────────────────────────

  describe('syncProduct', () => {
    it('재고/가격/상태를 반환한다', async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse({
        goods: {
          no: '12345',
          goods_nm: '동기화 상품',
          price: '30000',
          soldout_yn: 'N',
          stock_qty: '42',
        },
      }))

      const sync = await adapter.syncProduct('12345')

      expect(sync).toEqual({
        supplyStatus: 'available',
        stockQuantity: 42,
        price: 30000,
      })
    })

    it('상품이 없으면 에러를 던진다', async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse({ goods: null }))

      await expect(adapter.syncProduct('missing')).rejects.toThrow('도매꾹 상품 없음: missing')
    })
  })

  // ── 에러 처리 ───────────────────────────────────────────

  describe('에러 처리', () => {
    it('non-OK 응답 시 에러를 던진다', async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse({ error: 'Unauthorized' }, 401))

      await expect(adapter.searchProducts({})).rejects.toThrow('도매꾹 API 오류 401')
    })
  })
})
