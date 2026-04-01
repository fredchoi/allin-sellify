import { describe, it, expect, vi, beforeEach } from 'vitest'
import Fastify from 'fastify'
import type { FastifyInstance } from 'fastify'
import { inventoryModule } from '../routes.js'
import errorHandlerPlugin from '../../../plugins/error-handler.js'
import type { SellerContext } from '../../../types/seller-context.js'

// -------------------------------------------------
// 의존성 모킹
// -------------------------------------------------

vi.mock('../repository.js', () => ({
  listInventoryJobs: vi.fn().mockResolvedValue({
    jobs: [],
    total: 0,
  }),
  getInventoryJobById: vi.fn().mockResolvedValue({
    id: 'inv-uuid-001',
    wholesale_product_id: 'wp-uuid-001',
    tier: 'tier2',
    status: 'active',
  }),
  updateInventoryTier: vi.fn().mockResolvedValue({
    id: 'inv-uuid-001',
    tier: 'tier1',
    status: 'active',
  }),
  getInventoryHistory: vi.fn().mockResolvedValue([]),
}))

vi.mock('../service.js', () => ({
  schedulePollJobs: vi.fn().mockResolvedValue(5),
}))

vi.mock('../../../lib/queue.js', () => ({
  getQueueStats: vi.fn().mockResolvedValue({
    pending: 3,
    processing: 1,
    completed: 100,
    failed: 2,
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

  await app.register(inventoryModule, { prefix: '/api/v1/inventory' })
  return app
}

// -------------------------------------------------
// REST API 통합 테스트
// -------------------------------------------------

describe('GET /api/v1/inventory', () => {
  let app: FastifyInstance

  beforeEach(async () => {
    app = await buildTestApp()
  })

  it('재고 작업 목록을 조회한다', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/inventory?sellerId=550e8400-e29b-41d4-a716-446655440000',
    })

    expect(response.statusCode).toBe(200)
    const body = response.json()
    expect(body).toHaveProperty('jobs')
    expect(body).toHaveProperty('total')
  })

  it('sellerId가 없으면 400을 반환한다', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/inventory',
    })

    expect(response.statusCode).toBe(400)
  })
})

describe('GET /api/v1/inventory/:id', () => {
  let app: FastifyInstance

  beforeEach(async () => {
    app = await buildTestApp()
  })

  it('재고 작업 상세를 조회한다', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/inventory/inv-uuid-001',
    })

    expect(response.statusCode).toBe(200)
    const body = response.json()
    expect(body).toHaveProperty('id', 'inv-uuid-001')
  })
})

describe('PATCH /api/v1/inventory/:id/tier', () => {
  let app: FastifyInstance

  beforeEach(async () => {
    app = await buildTestApp()
  })

  it('유효한 tier 값으로 업데이트하면 200을 반환한다', async () => {
    const response = await app.inject({
      method: 'PATCH',
      url: '/api/v1/inventory/inv-uuid-001/tier',
      payload: {
        tier: 'tier1',
      },
    })

    expect(response.statusCode).toBe(200)
    const body = response.json()
    expect(body).toHaveProperty('tier', 'tier1')
  })

  it('유효하지 않은 tier 값이면 400을 반환한다', async () => {
    const response = await app.inject({
      method: 'PATCH',
      url: '/api/v1/inventory/inv-uuid-001/tier',
      payload: {
        tier: 'tier99',
      },
    })

    expect(response.statusCode).toBe(400)
  })
})

describe('GET /api/v1/inventory/:id/history', () => {
  let app: FastifyInstance

  beforeEach(async () => {
    app = await buildTestApp()
  })

  it('재고 변동 이력을 조회한다', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/inventory/inv-uuid-001/history',
    })

    expect(response.statusCode).toBe(200)
    const body = response.json()
    expect(Array.isArray(body)).toBe(true)
  })
})

describe('POST /api/v1/inventory/sync/trigger', () => {
  let app: FastifyInstance

  beforeEach(async () => {
    app = await buildTestApp()
  })

  it('동기화 트리거 시 큐에 추가된 작업 수를 반환한다', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/inventory/sync/trigger',
    })

    expect(response.statusCode).toBe(200)
    const body = response.json()
    expect(body).toHaveProperty('queued', 5)
    expect(body).toHaveProperty('message')
  })
})

describe('GET /api/v1/inventory/sync/status', () => {
  let app: FastifyInstance

  beforeEach(async () => {
    app = await buildTestApp()
  })

  it('큐 상태를 반환한다', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/inventory/sync/status',
    })

    expect(response.statusCode).toBe(200)
    const body = response.json()
    expect(body).toHaveProperty('waiting', 3)
    expect(body).toHaveProperty('active', 1)
    expect(body).toHaveProperty('completed', 100)
    expect(body).toHaveProperty('failed', 2)
  })
})
