import { describe, it, expect, vi, beforeEach } from 'vitest'

// ─────────────────────────────────────────────
// NaverAdAdapter 단위 테스트
// ─────────────────────────────────────────────

// config 모킹 — 어댑터가 import하는 환경변수
vi.mock('../../config.js', () => ({
  config: {
    NAVER_AD_API_KEY: 'test-api-key',
    NAVER_AD_SECRET: 'test-secret-key',
    NAVER_AD_CUSTOMER_ID: 'test-customer-id',
  },
}))

// AppError 모킹
vi.mock('../../plugins/error-handler.js', () => ({
  AppError: class AppError extends Error {
    constructor(
      public readonly statusCode: number,
      message: string,
      public readonly code: string
    ) {
      super(message)
      this.name = 'AppError'
    }
  },
}))

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

// 동적 import — 모킹 후에 불러온다
const { NaverAdAdapter } = await import('../naver-ad-adapter.js')

describe('NaverAdAdapter', () => {
  let adapter: InstanceType<typeof NaverAdAdapter>

  beforeEach(() => {
    vi.clearAllMocks()
    adapter = new NaverAdAdapter()
  })

  it('name이 "naver-ad"이다', () => {
    expect(adapter.name).toBe('naver-ad')
  })

  // ── getKeywordStats ─────────────────────────────────────

  describe('getKeywordStats', () => {
    it('API 응답을 KeywordSearchResult로 올바르게 매핑한다', async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse({
        keywordList: [
          {
            relKeyword: '무선이어폰',
            monthlyPcQcCnt: 12000,
            monthlyMobileQcCnt: 73000,
            compIdx: '높음',
            plAvgDepth: 620,
          },
        ],
      }))

      const results = await adapter.getKeywordStats(['무선이어폰'])

      expect(results).toHaveLength(1)
      expect(results[0]).toEqual({
        keyword: '무선이어폰',
        monthlySearchVolume: 85000, // 12000 + 73000
        monthlySearchVolumePC: 12000,
        monthlySearchVolumeMobile: 73000,
        competitionIndex: 0.8, // 높음 → 0.8
        averageBidPrice: 620,
      })
    })

    it('HMAC 서명 헤더가 요청에 포함된다', async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse({ keywordList: [] }))

      await adapter.getKeywordStats(['테스트'])

      const [, options] = mockFetch.mock.calls[0]
      expect(options.headers).toHaveProperty('X-Timestamp')
      expect(options.headers).toHaveProperty('X-API-KEY', 'test-api-key')
      expect(options.headers).toHaveProperty('X-Customer', 'test-customer-id')
      expect(options.headers).toHaveProperty('X-Signature')
      // 서명은 Base64 문자열이어야 한다
      expect(options.headers['X-Signature']).toMatch(/^[A-Za-z0-9+/]+=*$/)
    })

    it('경쟁도 "높음"은 0.8로 매핑된다', async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse({
        keywordList: [{ relKeyword: 'kw', monthlyPcQcCnt: 100, monthlyMobileQcCnt: 200, compIdx: '높음', plAvgDepth: 500 }],
      }))

      const results = await adapter.getKeywordStats(['kw'])
      expect(results[0].competitionIndex).toBe(0.8)
    })

    it('경쟁도 "중간"은 0.5로 매핑된다', async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse({
        keywordList: [{ relKeyword: 'kw', monthlyPcQcCnt: 100, monthlyMobileQcCnt: 200, compIdx: '중간', plAvgDepth: 500 }],
      }))

      const results = await adapter.getKeywordStats(['kw'])
      expect(results[0].competitionIndex).toBe(0.5)
    })

    it('경쟁도 "낮음"은 0.2로 매핑된다', async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse({
        keywordList: [{ relKeyword: 'kw', monthlyPcQcCnt: 100, monthlyMobileQcCnt: 200, compIdx: '낮음', plAvgDepth: 500 }],
      }))

      const results = await adapter.getKeywordStats(['kw'])
      expect(results[0].competitionIndex).toBe(0.2)
    })

    it('알 수 없는 경쟁도 레벨은 0.5로 기본 매핑된다', async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse({
        keywordList: [{ relKeyword: 'kw', monthlyPcQcCnt: 100, monthlyMobileQcCnt: 200, compIdx: '알수없음', plAvgDepth: 500 }],
      }))

      const results = await adapter.getKeywordStats(['kw'])
      expect(results[0].competitionIndex).toBe(0.5)
    })

    it('monthlySearchVolume은 PC + Mobile의 합이다', async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse({
        keywordList: [{ relKeyword: 'kw', monthlyPcQcCnt: 3000, monthlyMobileQcCnt: 7000, compIdx: '중간', plAvgDepth: 100 }],
      }))

      const results = await adapter.getKeywordStats(['kw'])
      expect(results[0].monthlySearchVolume).toBe(10000)
      expect(results[0].monthlySearchVolumePC).toBe(3000)
      expect(results[0].monthlySearchVolumeMobile).toBe(7000)
    })
  })

  // ── getKeywordTrend ─────────────────────────────────────

  describe('getKeywordTrend', () => {
    it('빈 배열을 반환한다 (DataLab 위임)', async () => {
      const results = await adapter.getKeywordTrend(['무선이어폰'])
      expect(results).toEqual([])
    })
  })

  // ── 에러 처리 ───────────────────────────────────────────

  describe('에러 처리', () => {
    it('non-OK 응답 시 AppError를 던진다', async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse({ error: 'Forbidden' }, 403))

      await expect(adapter.getKeywordStats(['test'])).rejects.toThrow('네이버 광고 API 호출 실패')
    })
  })
})
