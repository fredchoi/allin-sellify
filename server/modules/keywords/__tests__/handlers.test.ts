import { describe, it, expect, vi, beforeEach } from 'vitest'
import Fastify from 'fastify'
import type { FastifyInstance } from 'fastify'
import { keywordsModule } from '../routes.js'
import errorHandlerPlugin from '../../../plugins/error-handler.js'

// ─────────────────────────────────────────────
// 의존성 모킹
// ─────────────────────────────────────────────

vi.mock('../../../adapters/keyword-adapter-factory.js', () => ({
  createKeywordAdapter: () => ({
    name: 'mock-test',
    getKeywordStats: vi.fn().mockResolvedValue([
      {
        keyword: '무선이어폰',
        monthlySearchVolume: 85000,
        monthlySearchVolumePC: 12000,
        monthlySearchVolumeMobile: 73000,
        competitionIndex: 0.8,
        averageBidPrice: 620,
      },
    ]),
    getKeywordTrend: vi.fn().mockResolvedValue([
      {
        keyword: '무선이어폰',
        period: { start: '2025-01-01', end: '2025-03-31' },
        dataPoints: [{ date: '2025-01-01', ratio: 60 }],
      },
    ]),
  }),
}))

vi.mock('../repository.js', () => ({
  saveKeyword: vi.fn().mockResolvedValue({
    id: 'test-uuid',
    seller_id: '550e8400-e29b-41d4-a716-446655440000',
    keyword: '무선이어폰',
    search_volume: 85000,
    competition: 0.8,
    cgi: 0.21,
    trend_score: 0.5,
    opp_score: 0.4,
    category: null,
    status: 'active',
    last_analyzed_at: null,
    created_at: new Date('2025-01-01'),
    updated_at: new Date('2025-01-01'),
  }),
  listKeywords: vi.fn().mockResolvedValue({
    keywords: [],
    total: 0,
  }),
  getKeywordById: vi.fn().mockResolvedValue({
    id: 'test-uuid',
    keyword: '무선이어폰',
    status: 'active',
  }),
  archiveKeyword: vi.fn().mockResolvedValue(undefined),
  getKeywordDailyStats: vi.fn().mockResolvedValue([]),
}))

// ─────────────────────────────────────────────
// 테스트 서버 헬퍼
// ─────────────────────────────────────────────

async function buildTestApp(): Promise<FastifyInstance> {
  const app = Fastify({ logger: false })

  await app.register(errorHandlerPlugin)

  // DB mock 주입 (plugins/database.ts 없이 테스트)
  app.decorate('db', {
    query: vi.fn(),
    end: vi.fn(),
  } as any)

  await app.register(keywordsModule, { prefix: '/api/keywords' })
  return app
}

// ─────────────────────────────────────────────
// REST API 통합 테스트
// ─────────────────────────────────────────────

describe('POST /api/keywords/analyze', () => {
  let app: FastifyInstance

  beforeEach(async () => {
    app = await buildTestApp()
  })

  it('정상 요청에 대해 200과 results 배열을 반환한다', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/keywords/analyze',
      payload: {
        keywords: ['무선이어폰'],
        sellerId: '550e8400-e29b-41d4-a716-446655440000',
      },
    })

    expect(response.statusCode).toBe(200)
    const body = response.json()
    expect(body).toHaveProperty('results')
    expect(Array.isArray(body.results)).toBe(true)
    expect(body.results[0]).toMatchObject({
      keyword: '무선이어폰',
      searchVolume: 85000,
    })
  })

  it('keywords 배열이 비어있으면 400을 반환한다', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/keywords/analyze',
      payload: {
        keywords: [],
        sellerId: '550e8400-e29b-41d4-a716-446655440000',
      },
    })
    expect(response.statusCode).toBe(400)
  })

  it('keywords가 5개를 초과하면 400을 반환한다', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/keywords/analyze',
      payload: {
        keywords: ['A', 'B', 'C', 'D', 'E', 'F'],
        sellerId: '550e8400-e29b-41d4-a716-446655440000',
      },
    })
    expect(response.statusCode).toBe(400)
  })

  it('sellerId가 없으면 400을 반환한다', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/keywords/analyze',
      payload: {
        keywords: ['무선이어폰'],
      },
    })
    expect(response.statusCode).toBe(400)
  })

  it('sellerId가 UUID 형식이 아니면 400을 반환한다', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/keywords/analyze',
      payload: {
        keywords: ['무선이어폰'],
        sellerId: 'not-a-uuid',
      },
    })
    expect(response.statusCode).toBe(400)
  })

  it('빈 문자열 키워드가 포함되면 400을 반환한다', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/keywords/analyze',
      payload: {
        keywords: [''],
        sellerId: '550e8400-e29b-41d4-a716-446655440000',
      },
    })
    expect(response.statusCode).toBe(400)
  })

  it('특수문자 키워드도 정상 처리된다', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/keywords/analyze',
      payload: {
        keywords: ['USB-C 케이블 (1m)'],
        sellerId: '550e8400-e29b-41d4-a716-446655440000',
      },
    })
    // mock이 있으므로 200 반환
    expect(response.statusCode).toBe(200)
  })

  it('요청 body가 없으면 400을 반환한다', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/keywords/analyze',
    })
    expect(response.statusCode).toBe(400)
  })
})

describe('POST /api/keywords', () => {
  let app: FastifyInstance

  beforeEach(async () => {
    app = await buildTestApp()
  })

  it('정상 입력으로 키워드 저장 시 201을 반환한다', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/keywords',
      payload: {
        sellerId: '550e8400-e29b-41d4-a716-446655440000',
        keyword: '무선이어폰',
        searchVolume: 85000,
        competition: 0.8,
        cgi: 0.21,
        trendScore: 0.5,
        oppScore: 0.4,
      },
    })
    expect(response.statusCode).toBe(201)
  })

  it('searchVolume이 음수이면 400을 반환한다', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/keywords',
      payload: {
        sellerId: '550e8400-e29b-41d4-a716-446655440000',
        keyword: '테스트',
        searchVolume: -1,
        competition: 0.5,
        cgi: 0.5,
        trendScore: 0.5,
        oppScore: 0.5,
      },
    })
    expect(response.statusCode).toBe(400)
  })

  it('competition이 1 초과이면 400을 반환한다', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/keywords',
      payload: {
        sellerId: '550e8400-e29b-41d4-a716-446655440000',
        keyword: '테스트',
        searchVolume: 1000,
        competition: 1.5,
        cgi: 0.5,
        trendScore: 0.5,
        oppScore: 0.5,
      },
    })
    expect(response.statusCode).toBe(400)
  })
})

describe('GET /api/keywords', () => {
  let app: FastifyInstance

  beforeEach(async () => {
    app = await buildTestApp()
  })

  it('sellerId 쿼리 파라미터로 목록을 조회한다', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/keywords?sellerId=550e8400-e29b-41d4-a716-446655440000',
    })
    expect(response.statusCode).toBe(200)
    const body = response.json()
    expect(body).toHaveProperty('keywords')
    expect(body).toHaveProperty('pagination')
  })

  it('sellerId 없이 요청 시 400을 반환한다', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/keywords',
    })
    expect(response.statusCode).toBe(400)
  })

  it('페이지네이션 파라미터가 반영된다', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/keywords?sellerId=550e8400-e29b-41d4-a716-446655440000&page=2&limit=10',
    })
    expect(response.statusCode).toBe(200)
    const body = response.json()
    expect(body.pagination.page).toBe(2)
    expect(body.pagination.limit).toBe(10)
  })
})

describe('GET /api/keywords/:id', () => {
  let app: FastifyInstance

  beforeEach(async () => {
    app = await buildTestApp()
  })

  it('존재하는 ID로 키워드 상세를 조회한다', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/keywords/test-uuid',
    })
    expect(response.statusCode).toBe(200)
  })
})

describe('DELETE /api/keywords/:id', () => {
  let app: FastifyInstance

  beforeEach(async () => {
    app = await buildTestApp()
  })

  it('키워드 아카이브 시 204를 반환한다', async () => {
    const response = await app.inject({
      method: 'DELETE',
      url: '/api/keywords/test-uuid',
    })
    expect(response.statusCode).toBe(204)
  })
})

describe('GET /api/keywords/:id/trend', () => {
  let app: FastifyInstance

  beforeEach(async () => {
    app = await buildTestApp()
  })

  it('키워드 트렌드 데이터를 반환한다', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/keywords/test-uuid/trend',
    })
    expect(response.statusCode).toBe(200)
    const body = response.json()
    expect(body).toHaveProperty('stats')
    expect(Array.isArray(body.stats)).toBe(true)
  })
})
