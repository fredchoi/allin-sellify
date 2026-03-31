import { describe, it, expect, vi, beforeEach } from 'vitest'
import Fastify from 'fastify'
import type { FastifyInstance } from 'fastify'
import { settlementsModule } from '../routes.js'
import errorHandlerPlugin from '../../../plugins/error-handler.js'
import type { SellerContext } from '../../../types/seller-context.js'

// -------------------------------------------------
// 의존성 모킹
// -------------------------------------------------

vi.mock('../repository.js', () => ({
  listSettlements: vi.fn().mockResolvedValue({
    settlements: [],
    total: 0,
  }),
  getSettlementById: vi.fn().mockResolvedValue({
    id: 'settle-uuid-001',
    sellerId: '550e8400-e29b-41d4-a716-446655440000',
    marketplace: 'naver',
    status: 'pending',
    totalRevenue: 1000000,
    totalFee: 50000,
    netAmount: 950000,
  }),
  listFeeRules: vi.fn().mockResolvedValue([
    {
      id: 'rule-uuid-001',
      marketplace: 'naver',
      feeRate: 0.05,
      feeType: 'percentage',
    },
  ]),
  createFeeRule: vi.fn().mockResolvedValue({
    id: 'rule-uuid-002',
    marketplace: 'coupang',
    feeRate: 0.1,
    feeType: 'percentage',
    effectiveFrom: '2025-01-01',
  }),
}))

vi.mock('../service.js', () => ({
  calculateSettlement: vi.fn().mockResolvedValue({
    id: 'settle-uuid-002',
    sellerId: '550e8400-e29b-41d4-a716-446655440000',
    marketplace: 'naver',
    status: 'pending',
    totalRevenue: 500000,
    totalFee: 25000,
    netAmount: 475000,
  }),
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

  await app.register(settlementsModule, { prefix: '/api/v1/settlements' })
  return app
}

// -------------------------------------------------
// REST API 통합 테스트
// -------------------------------------------------

describe('GET /api/v1/settlements', () => {
  let app: FastifyInstance

  beforeEach(async () => {
    app = await buildTestApp()
  })

  it('정산 목록을 조회한다', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/settlements?sellerId=550e8400-e29b-41d4-a716-446655440000',
    })

    expect(response.statusCode).toBe(200)
    const body = response.json()
    expect(body).toHaveProperty('settlements')
    expect(body).toHaveProperty('pagination')
  })

  it('sellerId가 없으면 400을 반환한다', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/settlements',
    })

    expect(response.statusCode).toBe(400)
  })
})

describe('GET /api/v1/settlements/:id', () => {
  let app: FastifyInstance

  beforeEach(async () => {
    app = await buildTestApp()
  })

  it('정산 상세를 조회한다', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/settlements/settle-uuid-001',
    })

    expect(response.statusCode).toBe(200)
    const body = response.json()
    expect(body).toHaveProperty('id', 'settle-uuid-001')
    expect(body).toHaveProperty('netAmount', 950000)
  })
})

describe('POST /api/v1/settlements/calculate', () => {
  let app: FastifyInstance

  beforeEach(async () => {
    app = await buildTestApp()
  })

  it('정산 계산 요청에 대해 201을 반환한다', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/settlements/calculate',
      payload: {
        sellerId: '550e8400-e29b-41d4-a716-446655440000',
        marketplace: 'naver',
        periodStart: '2025-01-01',
        periodEnd: '2025-01-31',
      },
    })

    expect(response.statusCode).toBe(201)
    const body = response.json()
    expect(body).toHaveProperty('netAmount')
  })

  it('marketplace가 유효하지 않으면 400을 반환한다', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/settlements/calculate',
      payload: {
        sellerId: '550e8400-e29b-41d4-a716-446655440000',
        marketplace: 'amazon',
        periodStart: '2025-01-01',
        periodEnd: '2025-01-31',
      },
    })

    expect(response.statusCode).toBe(400)
  })
})

describe('GET /api/v1/settlements/fee-rules', () => {
  let app: FastifyInstance

  beforeEach(async () => {
    app = await buildTestApp()
  })

  it('수수료 규칙 목록을 조회한다', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/settlements/fee-rules',
    })

    expect(response.statusCode).toBe(200)
    const body = response.json()
    expect(body).toHaveProperty('rules')
    expect(Array.isArray(body.rules)).toBe(true)
  })
})

describe('POST /api/v1/settlements/fee-rules', () => {
  let app: FastifyInstance

  beforeEach(async () => {
    app = await buildTestApp()
  })

  it('수수료 규칙을 생성하면 201을 반환한다', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/settlements/fee-rules',
      payload: {
        marketplace: 'coupang',
        feeRate: 0.1,
        feeType: 'percentage',
        effectiveFrom: '2025-01-01',
      },
    })

    expect(response.statusCode).toBe(201)
    const body = response.json()
    expect(body).toHaveProperty('marketplace', 'coupang')
  })

  it('feeRate가 1 초과이면 400을 반환한다', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/settlements/fee-rules',
      payload: {
        marketplace: 'naver',
        feeRate: 1.5,
        feeType: 'percentage',
        effectiveFrom: '2025-01-01',
      },
    })

    expect(response.statusCode).toBe(400)
  })
})
