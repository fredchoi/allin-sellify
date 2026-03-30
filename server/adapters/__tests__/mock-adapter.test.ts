import { describe, it, expect, beforeEach } from 'vitest'
import { MockAdapter } from '../mock-adapter.js'

// ─────────────────────────────────────────────
// MockAdapter 단위 테스트
// ─────────────────────────────────────────────

describe('MockAdapter', () => {
  let adapter: MockAdapter

  beforeEach(() => {
    adapter = new MockAdapter()
  })

  describe('KeywordAdapter 인터페이스 준수', () => {
    it('name이 "mock"이다', () => {
      expect(adapter.name).toBe('mock')
    })

    it('getKeywordStats 메서드가 존재한다', () => {
      expect(typeof adapter.getKeywordStats).toBe('function')
    })

    it('getKeywordTrend 메서드가 존재한다', () => {
      expect(typeof adapter.getKeywordTrend).toBe('function')
    })
  })

  describe('getKeywordStats', () => {
    it('시드 키워드에 대해 결정적 결과를 반환한다', async () => {
      const results = await adapter.getKeywordStats(['무선이어폰'])
      expect(results).toHaveLength(1)
      expect(results[0]).toEqual({
        keyword: '무선이어폰',
        monthlySearchVolume: 85000,
        monthlySearchVolumePC: 12000,
        monthlySearchVolumeMobile: 73000,
        competitionIndex: 0.8,
        averageBidPrice: 620,
      })
    })

    it('여러 시드 키워드를 동시에 요청할 수 있다', async () => {
      const results = await adapter.getKeywordStats(['무선이어폰', '스마트워치', '에어팟'])
      expect(results).toHaveLength(3)
      expect(results.map((r) => r.keyword)).toEqual(['무선이어폰', '스마트워치', '에어팟'])
    })

    it('시드에 없는 키워드도 유효한 구조로 반환한다', async () => {
      const results = await adapter.getKeywordStats(['알수없는키워드xyz'])
      expect(results).toHaveLength(1)
      const r = results[0]
      expect(r.keyword).toBe('알수없는키워드xyz')
      expect(r.monthlySearchVolume).toBeGreaterThan(0)
      expect(r.competitionIndex).toBeGreaterThanOrEqual(0.1)
      expect(r.competitionIndex).toBeLessThanOrEqual(0.9)
      expect(r.averageBidPrice).toBeGreaterThan(0)
    })

    it('반환값의 monthlySearchVolume은 PC + Mobile의 합이다', async () => {
      const results = await adapter.getKeywordStats(['무선이어폰'])
      const r = results[0]
      expect(r.monthlySearchVolume).toBe(r.monthlySearchVolumePC + r.monthlySearchVolumeMobile)
    })

    it('competitionIndex는 0~1 범위이다', async () => {
      const keywords = ['무선이어폰', '블루투스이어폰', '노이즈캔슬링이어폰', '스마트워치', '알수없는키워드']
      const results = await adapter.getKeywordStats(keywords)
      for (const r of results) {
        expect(r.competitionIndex).toBeGreaterThanOrEqual(0)
        expect(r.competitionIndex).toBeLessThanOrEqual(1)
      }
    })

    it('빈 배열 입력 시 빈 배열을 반환한다', async () => {
      const results = await adapter.getKeywordStats([])
      expect(results).toEqual([])
    })

    it('특수문자 포함 키워드도 처리된다', async () => {
      const results = await adapter.getKeywordStats(['USB허브', '갤럭시버즈'])
      expect(results).toHaveLength(2)
      expect(results[0].keyword).toBe('USB허브')
      expect(results[1].keyword).toBe('갤럭시버즈')
    })
  })

  describe('getKeywordTrend', () => {
    it('요청한 키워드 수만큼 결과를 반환한다', async () => {
      const results = await adapter.getKeywordTrend(['무선이어폰', '스마트워치'])
      expect(results).toHaveLength(2)
    })

    it('각 결과는 keyword, period, dataPoints를 포함한다', async () => {
      const results = await adapter.getKeywordTrend(['무선이어폰'])
      const r = results[0]
      expect(r.keyword).toBe('무선이어폰')
      expect(r.period).toHaveProperty('start')
      expect(r.period).toHaveProperty('end')
      expect(Array.isArray(r.dataPoints)).toBe(true)
    })

    it('dataPoints는 date(YYYY-MM-DD)와 ratio(0~100) 형태이다', async () => {
      const results = await adapter.getKeywordTrend(['무선이어폰'])
      const { dataPoints } = results[0]
      expect(dataPoints.length).toBeGreaterThan(0)
      for (const dp of dataPoints) {
        expect(dp.date).toMatch(/^\d{4}-\d{2}-\d{2}$/)
        expect(dp.ratio).toBeGreaterThanOrEqual(0)
        expect(dp.ratio).toBeLessThanOrEqual(100)
      }
    })

    it('커스텀 startDate/endDate가 period에 반영된다', async () => {
      const results = await adapter.getKeywordTrend(['무선이어폰'], {
        startDate: '2025-01-01',
        endDate: '2025-03-31',
      })
      expect(results[0].period.start).toBe('2025-01-01')
      expect(results[0].period.end).toBe('2025-03-31')
    })

    it('빈 배열 입력 시 빈 배열을 반환한다', async () => {
      const results = await adapter.getKeywordTrend([])
      expect(results).toEqual([])
    })

    it('대량 키워드(10개)도 처리된다', async () => {
      const keywords = Array.from({ length: 10 }, (_, i) => `키워드${i}`)
      const results = await adapter.getKeywordTrend(keywords)
      expect(results).toHaveLength(10)
    })
  })
})
