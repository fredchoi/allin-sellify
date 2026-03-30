import type {
  KeywordAdapter,
  KeywordSearchResult,
  KeywordTrendResult,
} from './keyword-adapter.js'

const SEED_KEYWORDS: Record<string, KeywordSearchResult> = {
  무선이어폰: {
    keyword: '무선이어폰',
    monthlySearchVolume: 85000,
    monthlySearchVolumePC: 12000,
    monthlySearchVolumeMobile: 73000,
    competitionIndex: 0.8,
    averageBidPrice: 620,
  },
  블루투스이어폰: {
    keyword: '블루투스이어폰',
    monthlySearchVolume: 62000,
    monthlySearchVolumePC: 9500,
    monthlySearchVolumeMobile: 52500,
    competitionIndex: 0.75,
    averageBidPrice: 550,
  },
  노이즈캔슬링이어폰: {
    keyword: '노이즈캔슬링이어폰',
    monthlySearchVolume: 34000,
    monthlySearchVolumePC: 6800,
    monthlySearchVolumeMobile: 27200,
    competitionIndex: 0.65,
    averageBidPrice: 980,
  },
  스마트워치: {
    keyword: '스마트워치',
    monthlySearchVolume: 120000,
    monthlySearchVolumePC: 18000,
    monthlySearchVolumeMobile: 102000,
    competitionIndex: 0.85,
    averageBidPrice: 750,
  },
  갤럭시버즈: {
    keyword: '갤럭시버즈',
    monthlySearchVolume: 45000,
    monthlySearchVolumePC: 8000,
    monthlySearchVolumeMobile: 37000,
    competitionIndex: 0.7,
    averageBidPrice: 430,
  },
  에어팟: {
    keyword: '에어팟',
    monthlySearchVolume: 95000,
    monthlySearchVolumePC: 14000,
    monthlySearchVolumeMobile: 81000,
    competitionIndex: 0.9,
    averageBidPrice: 580,
  },
  USB허브: {
    keyword: 'USB허브',
    monthlySearchVolume: 28000,
    monthlySearchVolumePC: 8500,
    monthlySearchVolumeMobile: 19500,
    competitionIndex: 0.55,
    averageBidPrice: 320,
  },
  무선충전기: {
    keyword: '무선충전기',
    monthlySearchVolume: 52000,
    monthlySearchVolumePC: 9200,
    monthlySearchVolumeMobile: 42800,
    competitionIndex: 0.72,
    averageBidPrice: 410,
  },
  보조배터리: {
    keyword: '보조배터리',
    monthlySearchVolume: 78000,
    monthlySearchVolumePC: 11000,
    monthlySearchVolumeMobile: 67000,
    competitionIndex: 0.78,
    averageBidPrice: 480,
  },
  스마트폰케이스: {
    keyword: '스마트폰케이스',
    monthlySearchVolume: 140000,
    monthlySearchVolumePC: 22000,
    monthlySearchVolumeMobile: 118000,
    competitionIndex: 0.88,
    averageBidPrice: 290,
  },
}

function generateTrendDataPoints(keyword: string): Array<{ date: string; ratio: number }> {
  const points: Array<{ date: string; ratio: number }> = []
  const base = 50
  const now = new Date()

  for (let i = 90; i >= 0; i--) {
    const date = new Date(now)
    date.setDate(date.getDate() - i)
    const dateStr = date.toISOString().split('T')[0]

    // 사인파 기반 랜덤으로 현실적 패턴 모사
    const phase = (keyword.charCodeAt(0) % 10) * 0.628
    const wave = Math.sin((i / 30) * Math.PI + phase) * 15
    const noise = (Math.random() - 0.5) * 10
    const ratio = Math.max(0, Math.min(100, base + wave + noise))

    points.push({ date: dateStr, ratio: Math.round(ratio * 10) / 10 })
  }

  return points
}

export class MockAdapter implements KeywordAdapter {
  readonly name = 'mock'

  async getKeywordStats(
    keywords: string[],
    _options?: { device?: 'all' | 'pc' | 'mobile' }
  ): Promise<KeywordSearchResult[]> {
    return keywords.map((kw) => {
      if (SEED_KEYWORDS[kw]) {
        return SEED_KEYWORDS[kw]
      }
      return {
        keyword: kw,
        monthlySearchVolume: Math.floor(Math.random() * 50000) + 1000,
        monthlySearchVolumePC: Math.floor(Math.random() * 10000) + 500,
        monthlySearchVolumeMobile: Math.floor(Math.random() * 40000) + 500,
        competitionIndex: Math.random() * 0.8 + 0.1,
        averageBidPrice: Math.floor(Math.random() * 800) + 100,
      }
    })
  }

  async getKeywordTrend(
    keywords: string[],
    options?: { startDate?: string; endDate?: string; timeUnit?: 'date' | 'week' | 'month' }
  ): Promise<KeywordTrendResult[]> {
    const now = new Date()
    const start = options?.startDate ?? new Date(now.getFullYear(), now.getMonth() - 3, 1).toISOString().split('T')[0]
    const end = options?.endDate ?? now.toISOString().split('T')[0]

    return keywords.map((kw) => ({
      keyword: kw,
      period: { start, end },
      dataPoints: generateTrendDataPoints(kw),
    }))
  }
}
