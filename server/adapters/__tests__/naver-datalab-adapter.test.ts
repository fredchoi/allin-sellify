import { describe, it, expect, vi, beforeEach } from 'vitest'

// ─────────────────────────────────────────────
// NaverDataLabAdapter 단위 테스트
// ─────────────────────────────────────────────

// config 모킹
vi.mock('../../config.js', () => ({
  config: {
    NAVER_DATALAB_CLIENT_ID: 'test-client-id',
    NAVER_DATALAB_CLIENT_SECRET: 'test-client-secret',
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

const { NaverDataLabAdapter } = await import('../naver-datalab-adapter.js')

describe('NaverDataLabAdapter', () => {
  let adapter: InstanceType<typeof NaverDataLabAdapter>

  beforeEach(() => {
    vi.clearAllMocks()
    adapter = new NaverDataLabAdapter()
  })

  it('name이 "naver-datalab"이다', () => {
    expect(adapter.name).toBe('naver-datalab')
  })

  // ── getKeywordTrend ─────────────────────────────────────

  describe('getKeywordTrend', () => {
    it('API 응답을 KeywordTrendResult로 올바르게 매핑한다', async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse({
        results: [
          {
            title: '무선이어폰',
            keywords: ['무선이어폰'],
            data: [
              { period: '2025-01-01', ratio: 65.5 },
              { period: '2025-01-02', ratio: 70.2 },
            ],
          },
        ],
      }))

      const results = await adapter.getKeywordTrend(['무선이어폰'], {
        startDate: '2025-01-01',
        endDate: '2025-01-31',
      })

      expect(results).toHaveLength(1)
      expect(results[0]).toMatchObject({
        keyword: '무선이어폰',
        period: { start: '2025-01-01', end: '2025-01-31' },
      })
      expect(results[0].dataPoints).toEqual([
        { date: '2025-01-01', ratio: 65.5 },
        { date: '2025-01-02', ratio: 70.2 },
      ])
    })

    it('날짜 범위를 요청 body에 올바르게 전달한다', async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse({ results: [] }))

      await adapter.getKeywordTrend(['테스트'], {
        startDate: '2025-06-01',
        endDate: '2025-06-30',
        timeUnit: 'week',
      })

      const [, options] = mockFetch.mock.calls[0]
      const body = JSON.parse(options.body)
      expect(body.startDate).toBe('2025-06-01')
      expect(body.endDate).toBe('2025-06-30')
      expect(body.timeUnit).toBe('week')
    })

    it('옵션 없이 호출 시 기본 날짜 범위(3개월)를 사용한다', async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse({ results: [] }))

      await adapter.getKeywordTrend(['테스트'])

      const [, options] = mockFetch.mock.calls[0]
      const body = JSON.parse(options.body)
      // 기본값: 3개월 전 ~ 오늘
      expect(body.startDate).toMatch(/^\d{4}-\d{2}-\d{2}$/)
      expect(body.endDate).toMatch(/^\d{4}-\d{2}-\d{2}$/)
      expect(body.timeUnit).toBe('date')
    })

    it('여러 키워드를 keywordGroups로 변환한다', async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse({
        results: [
          { title: 'A', keywords: ['A'], data: [] },
          { title: 'B', keywords: ['B'], data: [] },
        ],
      }))

      await adapter.getKeywordTrend(['A', 'B'], {
        startDate: '2025-01-01',
        endDate: '2025-03-31',
      })

      const [, options] = mockFetch.mock.calls[0]
      const body = JSON.parse(options.body)
      expect(body.keywordGroups).toEqual([
        { groupName: 'A', keywords: ['A'] },
        { groupName: 'B', keywords: ['B'] },
      ])
    })

    it('인증 헤더가 요청에 포함된다', async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse({ results: [] }))

      await adapter.getKeywordTrend(['테스트'], {
        startDate: '2025-01-01',
        endDate: '2025-03-31',
      })

      const [, options] = mockFetch.mock.calls[0]
      expect(options.headers['X-Naver-Client-Id']).toBe('test-client-id')
      expect(options.headers['X-Naver-Client-Secret']).toBe('test-client-secret')
      expect(options.headers['Content-Type']).toBe('application/json')
    })
  })

  // ── getKeywordStats ─────────────────────────────────────

  describe('getKeywordStats', () => {
    it('빈 배열을 반환한다 (NaverAdAdapter 위임)', async () => {
      const results = await adapter.getKeywordStats(['무선이어폰'])
      expect(results).toEqual([])
    })
  })

  // ── 에러 처리 ───────────────────────────────────────────

  describe('에러 처리', () => {
    it('non-OK 응답 시 AppError를 던진다', async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse({ error: 'Rate limited' }, 429))

      await expect(
        adapter.getKeywordTrend(['test'], {
          startDate: '2025-01-01',
          endDate: '2025-03-31',
        })
      ).rejects.toThrow('네이버 DataLab API 호출 실패')
    })

    it('POST 메서드로 요청한다', async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse({ results: [] }))

      await adapter.getKeywordTrend(['테스트'], {
        startDate: '2025-01-01',
        endDate: '2025-03-31',
      })

      const [, options] = mockFetch.mock.calls[0]
      expect(options.method).toBe('POST')
    })
  })
})
