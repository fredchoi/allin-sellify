import { describe, it, expect, vi, beforeEach } from 'vitest'
import Fastify from 'fastify'
import type { FastifyInstance } from 'fastify'
import { leadsModule } from '../routes.js'
import errorHandlerPlugin from '../../../plugins/error-handler.js'
import type { SellerContext } from '../../../types/seller-context.js'

// -------------------------------------------------
// 의존성 모킹
// -------------------------------------------------

vi.mock('../repository.js', () => ({
  buildLeadsRepository: vi.fn().mockReturnValue({
    create: vi.fn().mockResolvedValue({
      id: 1,
      name: '홍길동',
      email: 'hong@example.com',
      plan: 'pro',
      source: 'landing',
      createdAt: new Date('2025-01-01'),
    }),
    count: vi.fn().mockResolvedValue(42),
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

  await app.register(leadsModule, { prefix: '/api/v1/leads' })
  return app
}

// -------------------------------------------------
// REST API 통합 테스트
// -------------------------------------------------

describe('POST /api/v1/leads', () => {
  let app: FastifyInstance

  beforeEach(async () => {
    app = await buildTestApp()
  })

  it('정상 입력으로 리드를 생성하면 201을 반환한다', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/leads',
      payload: {
        name: '홍길동',
        email: 'hong@example.com',
        plan: 'pro',
      },
    })

    expect(response.statusCode).toBe(201)
    const body = response.json()
    expect(body).toHaveProperty('success', true)
    expect(body).toHaveProperty('id', 1)
  })

  it('email 형식이 잘못되면 400을 반환한다', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/leads',
      payload: {
        name: '홍길동',
        email: 'not-an-email',
        plan: 'pro',
      },
    })

    expect(response.statusCode).toBe(400)
  })

  it('name이 빈 문자열이면 400을 반환한다', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/leads',
      payload: {
        name: '',
        email: 'hong@example.com',
        plan: 'pro',
      },
    })

    expect(response.statusCode).toBe(400)
  })

  it('plan이 유효하지 않은 값이면 400을 반환한다', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/leads',
      payload: {
        name: '홍길동',
        email: 'hong@example.com',
        plan: 'enterprise',
      },
    })

    expect(response.statusCode).toBe(400)
  })

  it('요청 body가 없으면 400을 반환한다', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/leads',
    })

    expect(response.statusCode).toBe(400)
  })
})

describe('GET /api/v1/leads/stats', () => {
  let app: FastifyInstance

  beforeEach(async () => {
    app = await buildTestApp()
  })

  it('리드 통계를 반환한다', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/leads/stats',
    })

    expect(response.statusCode).toBe(200)
    const body = response.json()
    expect(body).toHaveProperty('total', 42)
  })
})
