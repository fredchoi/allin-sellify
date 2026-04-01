import { describe, it, expect, vi, beforeEach } from 'vitest'
import Fastify from 'fastify'
import type { FastifyInstance } from 'fastify'
import { ordersModule } from '../routes.js'
import errorHandlerPlugin from '../../../plugins/error-handler.js'
import type { SellerContext } from '../../../types/seller-context.js'

// -------------------------------------------------
// 의존성 모킹
// -------------------------------------------------

vi.mock('../repository.js', () => ({
  listOrders: vi.fn().mockResolvedValue({
    orders: [],
    total: 0,
  }),
  getOrderById: vi.fn().mockResolvedValue({
    id: 'order-uuid-001',
    marketplace: 'naver',
    status: 'new',
    totalAmount: 29900,
  }),
  updateOrderStatus: vi.fn().mockResolvedValue({
    id: 'order-uuid-001',
    status: 'confirmed',
  }),
  createShipment: vi.fn().mockResolvedValue({
    id: 'shipment-uuid-001',
    orderId: 'order-uuid-001',
    carrier: 'CJ대한통운',
    trackingNumber: '1234567890',
  }),
  getOrderStats: vi.fn().mockResolvedValue({
    total: 50,
    newOrders: 10,
    preparing: 15,
    shipping: 20,
    delivered: 5,
  }),
}))

vi.mock('../service.js', () => ({
  collectMockOrders: vi.fn().mockResolvedValue({
    collected: 3,
    marketplace: 'naver',
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

  await app.register(ordersModule, { prefix: '/api/v1/orders' })
  return app
}

// -------------------------------------------------
// REST API 통합 테스트
// -------------------------------------------------

describe('GET /api/v1/orders', () => {
  let app: FastifyInstance

  beforeEach(async () => {
    app = await buildTestApp()
  })

  it('주문 목록을 조회한다', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/orders?sellerId=550e8400-e29b-41d4-a716-446655440000',
    })

    expect(response.statusCode).toBe(200)
    const body = response.json()
    expect(body).toHaveProperty('orders')
    expect(body).toHaveProperty('total')
  })

  it('sellerId가 없으면 400을 반환한다', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/orders',
    })

    expect(response.statusCode).toBe(400)
  })
})

describe('GET /api/v1/orders/stats', () => {
  let app: FastifyInstance

  beforeEach(async () => {
    app = await buildTestApp()
  })

  it('주문 통계를 반환한다', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/orders/stats?sellerId=550e8400-e29b-41d4-a716-446655440000',
    })

    expect(response.statusCode).toBe(200)
    const body = response.json()
    expect(body).toHaveProperty('total')
  })
})

describe('GET /api/v1/orders/:id', () => {
  let app: FastifyInstance

  beforeEach(async () => {
    app = await buildTestApp()
  })

  it('주문 상세를 조회한다', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/orders/order-uuid-001',
    })

    expect(response.statusCode).toBe(200)
    const body = response.json()
    expect(body).toHaveProperty('id', 'order-uuid-001')
  })
})

describe('PATCH /api/v1/orders/:id/status', () => {
  let app: FastifyInstance

  beforeEach(async () => {
    app = await buildTestApp()
  })

  it('주문 상태를 변경하면 200을 반환한다', async () => {
    const response = await app.inject({
      method: 'PATCH',
      url: '/api/v1/orders/order-uuid-001/status',
      payload: {
        status: 'confirmed',
      },
    })

    expect(response.statusCode).toBe(200)
    const body = response.json()
    expect(body).toHaveProperty('status', 'confirmed')
  })

  it('유효하지 않은 status 값이면 400을 반환한다', async () => {
    const response = await app.inject({
      method: 'PATCH',
      url: '/api/v1/orders/order-uuid-001/status',
      payload: {
        status: 'invalid_status',
      },
    })

    expect(response.statusCode).toBe(400)
  })
})

describe('POST /api/v1/orders/:id/tracking', () => {
  let app: FastifyInstance

  beforeEach(async () => {
    app = await buildTestApp()
  })

  it('송장 정보를 등록하면 201을 반환한다', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/orders/order-uuid-001/tracking',
      payload: {
        carrier: 'CJ대한통운',
        trackingNumber: '1234567890',
      },
    })

    expect(response.statusCode).toBe(201)
    const body = response.json()
    expect(body).toHaveProperty('carrier', 'CJ대한통운')
    expect(body).toHaveProperty('trackingNumber', '1234567890')
  })

  it('carrier가 빈 문자열이면 400을 반환한다', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/orders/order-uuid-001/tracking',
      payload: {
        carrier: '',
        trackingNumber: '1234567890',
      },
    })

    expect(response.statusCode).toBe(400)
  })
})

describe('POST /api/v1/orders/mock-collect', () => {
  let app: FastifyInstance

  beforeEach(async () => {
    app = await buildTestApp()
  })

  it('Mock 주문 수집을 실행하면 200을 반환한다', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/orders/mock-collect',
      payload: {
        marketplace: 'naver',
        sellerId: '550e8400-e29b-41d4-a716-446655440000',
      },
    })

    expect(response.statusCode).toBe(200)
    const body = response.json()
    expect(body).toHaveProperty('collected', 3)
  })

  it('marketplace가 유효하지 않으면 400을 반환한다', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/orders/mock-collect',
      payload: {
        marketplace: 'amazon',
        sellerId: '550e8400-e29b-41d4-a716-446655440000',
      },
    })

    expect(response.statusCode).toBe(400)
  })
})
