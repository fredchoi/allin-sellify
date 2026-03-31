import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── 모듈 모킹 ──────────────────────────────────────────────────────────────

vi.mock('../../../adapters/wholesale-adapter-factory.js', () => ({
  createWholesaleAdapter: vi.fn(),
}))

vi.mock('../../../adapters/marketplace-adapter-factory.js', () => ({
  createMarketplaceAdapter: vi.fn(),
}))

vi.mock('../../../services/ai-processing.js', () => ({
  processProductWithAi: vi.fn(),
  mockProcessProduct: vi.fn(),
}))

vi.mock('../../../services/fingerprint.js', () => ({
  computeTextFingerprint: vi.fn().mockReturnValue('fp-hash-abc'),
  isDuplicate: vi.fn().mockReturnValue(false),
}))

vi.mock('../../../services/image-processing.js', () => ({
  ImageProcessingService: vi.fn().mockImplementation(() => ({
    computePerceptualHash: vi.fn().mockResolvedValue('phash-abc123'),
    processMultiple: vi.fn().mockResolvedValue([]),
  })),
}))

vi.mock('../repository.js', () => ({
  upsertWholesaleProduct: vi.fn().mockResolvedValue('wp-uuid-001'),
  updateWholesaleFingerprint: vi.fn().mockResolvedValue(undefined),
  getWholesaleProductById: vi.fn(),
  createProcessedProduct: vi.fn().mockResolvedValue('pp-uuid-001'),
  updateProcessedProduct: vi.fn().mockResolvedValue(undefined),
  listWholesaleProducts: vi.fn(),
  listProcessedProducts: vi.fn(),
  getProcessedProductById: vi.fn(),
  listMarketListings: vi.fn(),
  createOrUpdateMarketListing: vi.fn().mockResolvedValue('ml-uuid-001'),
}))

vi.mock('../../../config.js', () => ({
  config: {
    UPLOAD_DIR: '/tmp/test-uploads',
    ANTHROPIC_API_KEY: '',
  },
}))

import { createWholesaleAdapter } from '../../../adapters/wholesale-adapter-factory.js'
import { createMarketplaceAdapter } from '../../../adapters/marketplace-adapter-factory.js'
import * as repo from '../repository.js'
import {
  collectProducts,
  processProduct,
  createListing,
  listWholesale,
  listProcessed,
  getProcessedDetail,
} from '../service.js'

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
// collectProducts 테스트
// ─────────────────────────────────────────────

describe('collectProducts', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('도매 어댑터를 통해 상품을 수집하고 DB에 저장한다', async () => {
    const mockAdapter = {
      name: 'domeggook' as const,
      searchProducts: vi.fn().mockResolvedValue({
        products: [
          {
            sourceProductId: 'DG-001',
            name: '무선 블루투스 이어폰',
            price: 15000,
            category: '전자기기',
            options: [{ name: '색상', values: ['블랙', '화이트'] }],
            images: ['https://example.com/img1.jpg'],
            supplyStatus: 'available',
            stockQuantity: 100,
          },
        ],
        total: 1,
        page: 1,
        pageSize: 20,
        hasMore: false,
      }),
      getProduct: vi.fn(),
      syncProduct: vi.fn(),
    }
    vi.mocked(createWholesaleAdapter).mockReturnValue(mockAdapter)

    const result = await collectProducts(
      {} as any,
      { source: 'domeggook', keyword: '이어폰', page: 1, pageSize: 20 },
      mockLog
    )

    expect(createWholesaleAdapter).toHaveBeenCalledWith('domeggook')
    expect(mockAdapter.searchProducts).toHaveBeenCalled()
    expect(repo.upsertWholesaleProduct).toHaveBeenCalledTimes(1)
    expect(repo.updateWholesaleFingerprint).toHaveBeenCalledWith(
      expect.anything(),
      'wp-uuid-001',
      'fp-hash-abc',
      'phash-abc123'
    )
    expect(result.collected).toBe(1)
    expect(result.skipped).toBe(0)
  })

  it('상품 저장 실패 시 skipped 카운트가 증가한다', async () => {
    const mockAdapter = {
      name: 'domeggook' as const,
      searchProducts: vi.fn().mockResolvedValue({
        products: [
          {
            sourceProductId: 'DG-ERR',
            name: '오류 상품',
            price: 5000,
            options: [],
            images: [],
            supplyStatus: 'available',
          },
        ],
        total: 1,
        page: 1,
        pageSize: 20,
        hasMore: false,
      }),
      getProduct: vi.fn(),
      syncProduct: vi.fn(),
    }
    vi.mocked(createWholesaleAdapter).mockReturnValue(mockAdapter)
    vi.mocked(repo.upsertWholesaleProduct).mockRejectedValueOnce(new Error('DB 오류'))

    const result = await collectProducts(
      {} as any,
      { source: 'domeggook', keyword: '테스트', page: 1, pageSize: 20 },
      mockLog
    )

    expect(result.skipped).toBe(1)
    expect(result.collected).toBe(0)
    expect(mockLog.error).toHaveBeenCalled()
  })

  it('이미지가 없는 상품은 이미지 해시를 빈 문자열로 저장한다', async () => {
    const mockAdapter = {
      name: 'mock' as const,
      searchProducts: vi.fn().mockResolvedValue({
        products: [
          {
            sourceProductId: 'NOIMG-001',
            name: '이미지 없는 상품',
            price: 3000,
            options: [],
            images: [],
            supplyStatus: 'available',
          },
        ],
        total: 1,
        page: 1,
        pageSize: 20,
        hasMore: false,
      }),
      getProduct: vi.fn(),
      syncProduct: vi.fn(),
    }
    vi.mocked(createWholesaleAdapter).mockReturnValue(mockAdapter)

    await collectProducts(
      {} as any,
      { source: 'mock', keyword: '테스트', page: 1, pageSize: 20 },
      mockLog
    )

    expect(repo.updateWholesaleFingerprint).toHaveBeenCalledWith(
      expect.anything(),
      'wp-uuid-001',
      'fp-hash-abc',
      ''
    )
  })
})

// ─────────────────────────────────────────────
// processProduct 테스트
// ─────────────────────────────────────────────

describe('processProduct', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('도매 상품을 조회하고 가공 레코드를 생성한다', async () => {
    vi.mocked(repo.getWholesaleProductById).mockResolvedValue({
      id: 'wp-uuid-001',
      source: 'domeggook',
      source_product_id: 'DG-001',
      name: '무선 이어폰',
      price: 15000,
      category: '전자기기',
      options: [],
      images: ['https://example.com/img.jpg'],
      supply_status: 'available',
      stock_quantity: 50,
      fingerprint_text: null,
      fingerprint_hash: null,
      last_synced_at: null,
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
    })

    const processedId = await processProduct(
      {} as any,
      {
        sellerId: 'seller-uuid-001',
        wholesaleProductId: 'wp-uuid-001',
        sellingPrice: 29900,
        marginRate: 0.3,
      },
      mockLog
    )

    expect(processedId).toBe('pp-uuid-001')
    expect(repo.getWholesaleProductById).toHaveBeenCalledWith(expect.anything(), 'wp-uuid-001')
    expect(repo.createProcessedProduct).toHaveBeenCalledWith(expect.anything(), {
      sellerId: 'seller-uuid-001',
      wholesaleProductId: 'wp-uuid-001',
      sellingPrice: 29900,
      marginRate: 0.3,
    })
  })

  it('존재하지 않는 도매 상품이면 에러를 던진다', async () => {
    vi.mocked(repo.getWholesaleProductById).mockResolvedValue(null)

    await expect(
      processProduct(
        {} as any,
        {
          sellerId: 'seller-uuid-001',
          wholesaleProductId: 'non-existent',
        },
        mockLog
      )
    ).rejects.toThrow('도매 상품을 찾을 수 없습니다')
  })
})

// ─────────────────────────────────────────────
// createListing 테스트
// ─────────────────────────────────────────────

describe('createListing', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('store 채널이면 마켓 어댑터를 호출하지 않고 DB만 저장한다', async () => {
    vi.mocked(repo.getProcessedProductById).mockResolvedValue({
      id: 'pp-uuid-001',
      seller_id: 'seller-001',
      wholesale_product_id: 'wp-001',
      title: 'AI 가공 제목',
      hooking_text: '후킹 문구',
      description: null,
      processed_images: [],
      processed_options: [],
      selling_price: 29900,
      margin_rate: '0.3',
      processing_status: 'completed',
      processing_checkpoints: {},
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
    })

    await createListing(
      {} as any,
      {
        processedProductId: 'pp-uuid-001',
        marketplace: 'store',
        listingPrice: 29900,
      },
      mockLog
    )

    expect(createMarketplaceAdapter).not.toHaveBeenCalled()
    expect(repo.createOrUpdateMarketListing).toHaveBeenCalled()
  })

  it('naver 채널이면 마켓 어댑터를 통해 등록 후 DB에 저장한다', async () => {
    vi.mocked(repo.getProcessedProductById).mockResolvedValue({
      id: 'pp-uuid-001',
      seller_id: 'seller-001',
      wholesale_product_id: 'wp-001',
      title: 'AI 가공 제목',
      hooking_text: null,
      description: '상세 설명',
      processed_images: ['img1.jpg'],
      processed_options: [],
      selling_price: 29900,
      margin_rate: '0.3',
      processing_status: 'completed',
      processing_checkpoints: {},
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
    })

    const mockMarketAdapter = {
      name: 'naver' as const,
      createListing: vi.fn().mockResolvedValue({
        marketProductId: 'naver-pid-001',
        listingUrl: 'https://smartstore.naver.com/test/products/001',
        status: 'pending',
      }),
      updateListing: vi.fn(),
      collectOrders: vi.fn(),
      uploadTracking: vi.fn(),
      getListingStatus: vi.fn(),
    }
    vi.mocked(createMarketplaceAdapter).mockReturnValue(mockMarketAdapter)

    await createListing(
      {} as any,
      {
        processedProductId: 'pp-uuid-001',
        marketplace: 'naver',
        listingPrice: 29900,
      },
      mockLog
    )

    expect(createMarketplaceAdapter).toHaveBeenCalledWith('naver')
    expect(mockMarketAdapter.createListing).toHaveBeenCalled()
    expect(repo.createOrUpdateMarketListing).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        marketplace: 'naver',
        marketProductId: 'naver-pid-001',
      })
    )
  })
})

// ─────────────────────────────────────────────
// 조회 함수 테스트
// ─────────────────────────────────────────────

describe('listWholesale', () => {
  it('repository에 옵션을 전달하여 도매 상품 목록을 반환한다', async () => {
    const mockResult = { products: [], total: 0 }
    vi.mocked(repo.listWholesaleProducts).mockResolvedValue(mockResult)

    const result = await listWholesale({} as any, { page: 1, pageSize: 20 })

    expect(repo.listWholesaleProducts).toHaveBeenCalledWith(expect.anything(), {
      page: 1,
      pageSize: 20,
    })
    expect(result).toEqual(mockResult)
  })
})

describe('listProcessed', () => {
  it('repository에 필터를 전달하여 가공 상품 목록을 반환한다', async () => {
    const mockResult = { products: [], total: 0 }
    vi.mocked(repo.listProcessedProducts).mockResolvedValue(mockResult)

    const result = await listProcessed({} as any, {
      sellerId: 'seller-001',
      page: 1,
      pageSize: 10,
    })

    expect(repo.listProcessedProducts).toHaveBeenCalledWith(expect.anything(), {
      sellerId: 'seller-001',
      page: 1,
      pageSize: 10,
    })
    expect(result).toEqual(mockResult)
  })
})

describe('getProcessedDetail', () => {
  it('가공 상품과 마켓 등록 목록을 함께 반환한다', async () => {
    vi.mocked(repo.getProcessedProductById).mockResolvedValue({
      id: 'pp-uuid-001',
      seller_id: 'seller-001',
      wholesale_product_id: 'wp-001',
      title: 'AI 가공 제목',
      hooking_text: null,
      description: null,
      processed_images: [],
      processed_options: [],
      selling_price: 29900,
      margin_rate: '0.3',
      processing_status: 'completed',
      processing_checkpoints: {},
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
    })
    vi.mocked(repo.listMarketListings).mockResolvedValue([
      { id: 'ml-001', marketplace: 'naver', listing_status: 'active' },
    ])

    const result = await getProcessedDetail({} as any, 'pp-uuid-001')

    expect(result).toMatchObject({
      id: 'pp-uuid-001',
      listings: [{ id: 'ml-001', marketplace: 'naver' }],
    })
  })

  it('존재하지 않는 가공 상품이면 null을 반환한다', async () => {
    vi.mocked(repo.getProcessedProductById).mockResolvedValue(null)

    const result = await getProcessedDetail({} as any, 'non-existent')

    expect(result).toBeNull()
  })
})
