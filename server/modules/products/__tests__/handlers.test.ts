import { describe, it, expect, vi, beforeEach } from 'vitest'
import Fastify from 'fastify'
import type { FastifyInstance } from 'fastify'
import { productsModule } from '../routes.js'
import errorHandlerPlugin from '../../../plugins/error-handler.js'
import type { SellerContext } from '../../../types/seller-context.js'

// -------------------------------------------------
// 의존성 모킹
// -------------------------------------------------

vi.mock('../service.js', () => ({
  collectProducts: vi.fn().mockResolvedValue({
    inserted: 5,
    skipped: 0,
  }),
  listWholesale: vi.fn().mockResolvedValue({
    products: [],
    total: 0,
  }),
  listProcessed: vi.fn().mockResolvedValue({
    products: [],
    total: 0,
  }),
  processProduct: vi.fn().mockResolvedValue('processed-uuid-001'),
  getProcessedDetail: vi.fn().mockResolvedValue({
    id: 'processed-uuid-001',
    title: '테스트 상품',
    processingStatus: 'completed',
  }),
  updateProcessed: vi.fn().mockResolvedValue(undefined),
  createListing: vi.fn().mockResolvedValue('listing-uuid-001'),
}))

// -------------------------------------------------
// 테스트 셀러 컨텍스트
// -------------------------------------------------

const TEST_SELLER: SellerContext = {
  sellerId: '550e8400-e29b-41d4-a716-446655440000',
  plan: 'starter',
  quotas: { dailyProducts: 50, dailyAnalyze: 20 },
}

// -------------------------------------------------
// 테스트 서버 헬퍼
// -------------------------------------------------

async function buildTestApp(): Promise<FastifyInstance> {
  const app = Fastify({ logger: false })

  await app.register(errorHandlerPlugin)

  app.decorate('db', {
    query: vi.fn(),
    end: vi.fn(),
  } as any)

  app.decorate('authenticate', async (request: any) => {
    request.seller = TEST_SELLER
  })

  await app.register(productsModule, { prefix: '/api/v1/products' })
  return app
}

// -------------------------------------------------
// REST API 통합 테스트
// -------------------------------------------------

describe('POST /api/v1/products/collect', () => {
  let app: FastifyInstance

  beforeEach(async () => {
    app = await buildTestApp()
  })

  it('정상 요청에 대해 200과 수집 결과를 반환한다', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/products/collect',
      payload: {
        source: 'mock',
        sellerId: '550e8400-e29b-41d4-a716-446655440000',
      },
    })

    expect(response.statusCode).toBe(200)
    const body = response.json()
    expect(body).toHaveProperty('ok', true)
    expect(body).toHaveProperty('inserted')
  })

  it('sellerId가 유효하지 않은 UUID이면 400을 반환한다', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/products/collect',
      payload: {
        source: 'mock',
        sellerId: 'invalid-uuid',
      },
    })

    expect(response.statusCode).toBe(400)
  })
})

describe('GET /api/v1/products/wholesale', () => {
  let app: FastifyInstance

  beforeEach(async () => {
    app = await buildTestApp()
  })

  it('도매 상품 목록을 조회한다', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/products/wholesale',
    })

    expect(response.statusCode).toBe(200)
    const body = response.json()
    expect(body).toHaveProperty('products')
    expect(body).toHaveProperty('total')
  })
})

describe('GET /api/v1/products/processed', () => {
  let app: FastifyInstance

  beforeEach(async () => {
    app = await buildTestApp()
  })

  it('가공 상품 목록을 조회한다', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/products/processed',
    })

    expect(response.statusCode).toBe(200)
    const body = response.json()
    expect(body).toHaveProperty('products')
  })
})

describe('POST /api/v1/products/process', () => {
  let app: FastifyInstance

  beforeEach(async () => {
    app = await buildTestApp()
  })

  it('정상 요청에 대해 202와 processedProductId를 반환한다', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/products/process',
      payload: {
        wholesaleProductId: '550e8400-e29b-41d4-a716-446655440000',
        sellerId: '550e8400-e29b-41d4-a716-446655440000',
      },
    })

    expect(response.statusCode).toBe(202)
    const body = response.json()
    expect(body).toHaveProperty('ok', true)
    expect(body).toHaveProperty('processedProductId')
  })

  it('wholesaleProductId가 없으면 400을 반환한다', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/products/process',
      payload: {
        sellerId: '550e8400-e29b-41d4-a716-446655440000',
      },
    })

    expect(response.statusCode).toBe(400)
  })
})

describe('GET /api/v1/products/processed/:id', () => {
  let app: FastifyInstance

  beforeEach(async () => {
    app = await buildTestApp()
  })

  it('가공 상품 상세를 조회한다', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/products/processed/processed-uuid-001',
    })

    expect(response.statusCode).toBe(200)
    const body = response.json()
    expect(body).toHaveProperty('id', 'processed-uuid-001')
  })
})

describe('PATCH /api/v1/products/processed/:id', () => {
  let app: FastifyInstance

  beforeEach(async () => {
    app = await buildTestApp()
  })

  it('가공 결과를 수정하면 200을 반환한다', async () => {
    const response = await app.inject({
      method: 'PATCH',
      url: '/api/v1/products/processed/processed-uuid-001',
      payload: {
        title: '수정된 상품명',
      },
    })

    expect(response.statusCode).toBe(200)
    const body = response.json()
    expect(body).toHaveProperty('ok', true)
  })

  it('title이 빈 문자열이면 400을 반환한다', async () => {
    const response = await app.inject({
      method: 'PATCH',
      url: '/api/v1/products/processed/processed-uuid-001',
      payload: {
        title: '',
      },
    })

    expect(response.statusCode).toBe(400)
  })
})

describe('POST /api/v1/products/listings', () => {
  let app: FastifyInstance

  beforeEach(async () => {
    app = await buildTestApp()
  })

  it('마켓 등록 요청 시 201을 반환한다', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/products/listings',
      payload: {
        processedProductId: '550e8400-e29b-41d4-a716-446655440000',
        marketplace: 'naver',
        listingPrice: 29900,
      },
    })

    expect(response.statusCode).toBe(201)
    const body = response.json()
    expect(body).toHaveProperty('ok', true)
    expect(body).toHaveProperty('listingId')
  })

  it('listingPrice가 0이면 400을 반환한다', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/products/listings',
      payload: {
        processedProductId: '550e8400-e29b-41d4-a716-446655440000',
        marketplace: 'naver',
        listingPrice: 0,
      },
    })

    expect(response.statusCode).toBe(400)
  })
})
