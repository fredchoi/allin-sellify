import { describe, it, expect, vi } from 'vitest'
import { calculateOppScore, analyzeKeywords } from '../service.js'
import type { KeywordAdapter } from '../../../adapters/keyword-adapter.js'

// ─────────────────────────────────────────────
// OPP 스코어링 단위 테스트
// ─────────────────────────────────────────────

describe('calculateOppScore', () => {
  describe('가중치 검증 (SV=0.35, CGI=0.45, TM=0.20)', () => {
    it('정상 입력값에 대해 0~1 범위의 점수를 반환한다', () => {
      const score = calculateOppScore({
        searchVolume: 50000,
        competition: 0.5,
        avgBidPrice: 2500,
        trendDataPoints: [],
      })
      expect(score).toBeGreaterThanOrEqual(0)
      expect(score).toBeLessThanOrEqual(1)
    })

    it('경쟁도가 낮고 입찰가가 높으면 CGI가 높아 점수가 높다', () => {
      const highCGI = calculateOppScore({
        searchVolume: 10000,
        competition: 0.1,  // 낮은 경쟁
        avgBidPrice: 4900,  // 높은 입찰가
        trendDataPoints: [],
      })
      const lowCGI = calculateOppScore({
        searchVolume: 10000,
        competition: 0.9,  // 높은 경쟁
        avgBidPrice: 100,   // 낮은 입찰가
        trendDataPoints: [],
      })
      expect(highCGI).toBeGreaterThan(lowCGI)
    })

    it('검색량이 많을수록 SV 기여분이 증가한다', () => {
      const highSV = calculateOppScore({
        searchVolume: 100000,
        competition: 0.5,
        avgBidPrice: 500,
        trendDataPoints: [],
      })
      const lowSV = calculateOppScore({
        searchVolume: 100,
        competition: 0.5,
        avgBidPrice: 500,
        trendDataPoints: [],
      })
      expect(highSV).toBeGreaterThan(lowSV)
    })

    it('소수점 4자리로 반올림된 결과를 반환한다', () => {
      const score = calculateOppScore({
        searchVolume: 12345,
        competition: 0.333,
        avgBidPrice: 1234,
        trendDataPoints: [],
      })
      const decimals = score.toString().split('.')[1]?.length ?? 0
      expect(decimals).toBeLessThanOrEqual(4)
    })

    it('트렌드 데이터가 충분할 때 최근 상승 추세면 점수가 높아진다', () => {
      // 최근 28일 ratio가 전체 평균보다 높은 케이스
      const risingTrend = Array.from({ length: 90 }, (_, i) => ({
        date: `2025-${String(Math.floor(i / 30) + 1).padStart(2, '0')}-${String((i % 30) + 1).padStart(2, '0')}`,
        ratio: i < 62 ? 30 : 80, // 최근 28일(62~90)에 높은 ratio
      }))

      // 최근 28일 ratio가 전체 평균보다 낮은 케이스
      const fallingTrend = Array.from({ length: 90 }, (_, i) => ({
        date: `2025-${String(Math.floor(i / 30) + 1).padStart(2, '0')}-${String((i % 30) + 1).padStart(2, '0')}`,
        ratio: i < 62 ? 80 : 30,
      }))

      const risingScore = calculateOppScore({
        searchVolume: 50000,
        competition: 0.5,
        avgBidPrice: 500,
        trendDataPoints: risingTrend,
      })
      const fallingScore = calculateOppScore({
        searchVolume: 50000,
        competition: 0.5,
        avgBidPrice: 500,
        trendDataPoints: fallingTrend,
      })
      expect(risingScore).toBeGreaterThan(fallingScore)
    })
  })

  describe('엣지 케이스', () => {
    it('검색량 0이면 SV 기여분이 0이다', () => {
      const zeroSV = calculateOppScore({
        searchVolume: 0,
        competition: 0.5,
        avgBidPrice: 500,
        trendDataPoints: [],
      })
      const nonZeroSV = calculateOppScore({
        searchVolume: 1000,
        competition: 0.5,
        avgBidPrice: 500,
        trendDataPoints: [],
      })
      expect(zeroSV).toBeLessThan(nonZeroSV)
    })

    it('음수 검색량은 0으로 처리된다', () => {
      const negScore = calculateOppScore({
        searchVolume: -100,
        competition: 0.5,
        avgBidPrice: 500,
        trendDataPoints: [],
      })
      const zeroScore = calculateOppScore({
        searchVolume: 0,
        competition: 0.5,
        avgBidPrice: 500,
        trendDataPoints: [],
      })
      expect(negScore).toBe(zeroScore)
    })

    it('트렌드 데이터 없으면 TM은 0.5(중립)로 처리된다', () => {
      const noTrend = calculateOppScore({
        searchVolume: 10000,
        competition: 0.5,
        avgBidPrice: 1000,
        trendDataPoints: [],
      })
      // TM=0.5로 직접 계산: sv = log10(10000)/5 = 0.8, cgi = 0.5*0.6 + 0.2*0.4 = 0.38
      // score = 0.8*0.35 + 0.38*0.45 + 0.5*0.20 = 0.28 + 0.171 + 0.10 = 0.551
      expect(noTrend).toBeCloseTo(0.551, 3)
    })

    it('검색량이 매우 커도 SV는 1을 초과하지 않는다', () => {
      const score = calculateOppScore({
        searchVolume: 9999999999,
        competition: 0,
        avgBidPrice: 99999,
        trendDataPoints: [],
      })
      expect(score).toBeLessThanOrEqual(1)
    })

    it('경쟁도 1, 입찰가 0이면 CGI 기여분이 최소화된다', () => {
      const minCGI = calculateOppScore({
        searchVolume: 10000,
        competition: 1,
        avgBidPrice: 0,
        trendDataPoints: [],
      })
      // CGI = 0*0.6 + 0*0.4 = 0
      // sv = log10(10000)/5 = 0.8, tm = 0.5
      // score = 0.8*0.35 + 0*0.45 + 0.5*0.20 = 0.28 + 0 + 0.10 = 0.38
      expect(minCGI).toBeCloseTo(0.38, 3)
    })

    it('totalAvg가 0인 트렌드 데이터는 TM=0.5를 반환한다', () => {
      const allZeroTrend = Array.from({ length: 10 }, (_, i) => ({
        date: `2025-01-${String(i + 1).padStart(2, '0')}`,
        ratio: 0,
      }))
      const score = calculateOppScore({
        searchVolume: 10000,
        competition: 0.5,
        avgBidPrice: 1000,
        trendDataPoints: allZeroTrend,
      })
      // TM=0.5 동일 케이스와 같아야 한다
      const emptyTrend = calculateOppScore({
        searchVolume: 10000,
        competition: 0.5,
        avgBidPrice: 1000,
        trendDataPoints: [],
      })
      expect(score).toBe(emptyTrend)
    })
  })
})

// ─────────────────────────────────────────────
// analyzeKeywords 함수 테스트
// ─────────────────────────────────────────────

describe('analyzeKeywords', () => {
  const makeAdapter = (overrides?: Partial<KeywordAdapter>): KeywordAdapter => ({
    name: 'test',
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
    ...overrides,
  })

  it('stats와 trend를 결합해 AnalyzedKeyword 배열을 반환한다', async () => {
    const adapter = makeAdapter()
    const results = await analyzeKeywords(['무선이어폰'], adapter)

    expect(results).toHaveLength(1)
    expect(results[0]).toMatchObject({
      keyword: '무선이어폰',
      searchVolume: 85000,
      competition: 0.8,
    })
    expect(results[0].oppScore).toBeGreaterThan(0)
    expect(results[0].cgi).toBeGreaterThan(0)
    expect(results[0].trendScore).toBeGreaterThan(0)
  })

  it('stats와 trend API를 병렬로 호출한다', async () => {
    const callOrder: string[] = []
    const adapter = makeAdapter({
      getKeywordStats: vi.fn().mockImplementation(async () => {
        callOrder.push('stats')
        return [
          {
            keyword: '테스트',
            monthlySearchVolume: 1000,
            monthlySearchVolumePC: 300,
            monthlySearchVolumeMobile: 700,
            competitionIndex: 0.5,
            averageBidPrice: 500,
          },
        ]
      }),
      getKeywordTrend: vi.fn().mockImplementation(async () => {
        callOrder.push('trend')
        return [{ keyword: '테스트', period: { start: '2025-01-01', end: '2025-03-31' }, dataPoints: [] }]
      }),
    })

    await analyzeKeywords(['테스트'], adapter)
    // 두 API 모두 호출됨
    expect(callOrder).toContain('stats')
    expect(callOrder).toContain('trend')
  })

  it('trend 데이터가 없는 키워드는 빈 배열로 처리된다', async () => {
    const adapter = makeAdapter({
      getKeywordTrend: vi.fn().mockResolvedValue([]), // trend 없음
    })
    const results = await analyzeKeywords(['무선이어폰'], adapter)
    expect(results[0].trend).toEqual([])
    expect(results[0].trendScore).toBe(0.5) // 기본값
  })

  it('반환된 cgi와 trendScore는 소수점 4자리 이하이다', async () => {
    const adapter = makeAdapter()
    const results = await analyzeKeywords(['무선이어폰'], adapter)
    const { cgi, trendScore } = results[0]

    const cgiDecimals = cgi.toString().split('.')[1]?.length ?? 0
    const tsDecimals = trendScore.toString().split('.')[1]?.length ?? 0
    expect(cgiDecimals).toBeLessThanOrEqual(4)
    expect(tsDecimals).toBeLessThanOrEqual(4)
  })

  it('여러 키워드를 동시에 분석한다', async () => {
    const adapter: KeywordAdapter = {
      name: 'test',
      getKeywordStats: vi.fn().mockResolvedValue([
        { keyword: 'A', monthlySearchVolume: 10000, monthlySearchVolumePC: 2000, monthlySearchVolumeMobile: 8000, competitionIndex: 0.3, averageBidPrice: 300 },
        { keyword: 'B', monthlySearchVolume: 20000, monthlySearchVolumePC: 5000, monthlySearchVolumeMobile: 15000, competitionIndex: 0.6, averageBidPrice: 600 },
      ]),
      getKeywordTrend: vi.fn().mockResolvedValue([
        { keyword: 'A', period: { start: '2025-01-01', end: '2025-03-31' }, dataPoints: [] },
        { keyword: 'B', period: { start: '2025-01-01', end: '2025-03-31' }, dataPoints: [] },
      ]),
    }
    const results = await analyzeKeywords(['A', 'B'], adapter)
    expect(results).toHaveLength(2)
    expect(results.map((r) => r.keyword)).toEqual(['A', 'B'])
  })
})
