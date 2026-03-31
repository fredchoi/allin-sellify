import { describe, it, expect, vi, beforeEach } from 'vitest'
import Fastify from 'fastify'
import type { FastifyInstance } from 'fastify'
import { contentModule } from '../routes.js'
import errorHandlerPlugin from '../../../plugins/error-handler.js'
import type { SellerContext } from '../../../types/seller-context.js'

// -------------------------------------------------
// 의존성 모킹
// -------------------------------------------------

vi.mock('../service.js', () => ({
  createContentPost: vi.fn().mockResolvedValue('content-uuid-001'),
  listPosts: vi.fn().mockResolvedValue({
    rows: [],
    total: 0,
  }),
  getPostDetail: vi.fn().mockResolvedValue({
    id: 'content-uuid-001',
    masterTitle: '테스트 콘텐츠',
    masterBody: '테스트 본문입니다.',
    postStatus: 'ready',
    channels: [],
  }),
  publishChannels: vi.fn().mockResolvedValue({
    published: ['blog', 'instagram'],
    failed: [],
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

  await app.register(contentModule, { prefix: '/api/v1/content' })
  return app
}

// -------------------------------------------------
// REST API 통합 테스트
// -------------------------------------------------

describe('POST /api/v1/content', () => {
  let app: FastifyInstance

  beforeEach(async () => {
    app = await buildTestApp()
  })

  it('콘텐츠 생성 요청에 대해 202를 반환한다', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/content',
      payload: {
        sellerId: '550e8400-e29b-41d4-a716-446655440000',
        masterTitle: '테스트 콘텐츠',
        masterBody: '테스트 본문입니다.',
      },
    })

    expect(response.statusCode).toBe(202)
    const body = response.json()
    expect(body).toHaveProperty('id', 'content-uuid-001')
    expect(body).toHaveProperty('status', 'generating')
  })

  it('masterTitle이 빈 문자열이면 400을 반환한다', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/content',
      payload: {
        sellerId: '550e8400-e29b-41d4-a716-446655440000',
        masterTitle: '',
        masterBody: '본문',
      },
    })

    expect(response.statusCode).toBe(400)
  })

  it('masterBody가 없으면 400을 반환한다', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/content',
      payload: {
        sellerId: '550e8400-e29b-41d4-a716-446655440000',
        masterTitle: '제목',
      },
    })

    expect(response.statusCode).toBe(400)
  })
})

describe('GET /api/v1/content', () => {
  let app: FastifyInstance

  beforeEach(async () => {
    app = await buildTestApp()
  })

  it('콘텐츠 목록을 조회한다', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/content',
    })

    expect(response.statusCode).toBe(200)
    const body = response.json()
    expect(body).toHaveProperty('data')
    expect(body).toHaveProperty('total')
    expect(body).toHaveProperty('page')
    expect(body).toHaveProperty('pageSize')
  })
})

describe('GET /api/v1/content/:id', () => {
  let app: FastifyInstance

  beforeEach(async () => {
    app = await buildTestApp()
  })

  it('콘텐츠 상세를 조회한다', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/content/content-uuid-001',
    })

    expect(response.statusCode).toBe(200)
    const body = response.json()
    expect(body).toHaveProperty('id', 'content-uuid-001')
    expect(body).toHaveProperty('masterTitle', '테스트 콘텐츠')
  })
})

describe('POST /api/v1/content/:id/publish', () => {
  let app: FastifyInstance

  beforeEach(async () => {
    app = await buildTestApp()
  })

  it('채널 발행 요청에 대해 200을 반환한다', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/content/content-uuid-001/publish',
      payload: {
        channels: ['blog', 'instagram'],
      },
    })

    expect(response.statusCode).toBe(200)
    const body = response.json()
    expect(body).toHaveProperty('published')
    expect(body.published).toContain('blog')
  })

  it('channels 배열이 비어있으면 400을 반환한다', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/content/content-uuid-001/publish',
      payload: {
        channels: [],
      },
    })

    expect(response.statusCode).toBe(400)
  })

  it('유효하지 않은 채널이 포함되면 400을 반환한다', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/content/content-uuid-001/publish',
      payload: {
        channels: ['blog', 'tiktok'],
      },
    })

    expect(response.statusCode).toBe(400)
  })
})
