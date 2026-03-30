import type { KeywordAdapter } from '../../adapters/keyword-adapter.js'

const WEIGHTS = {
  SV: 0.35,
  CGI: 0.45,
  TM: 0.20,
} as const

function normalizeSearchVolume(sv: number): number {
  if (sv <= 0) return 0
  return Math.min(1, Math.log10(sv) / 5)
}

function calculateCGI(competition: number, avgBidPrice: number): number {
  const competitionFactor = 1 - competition
  const bidFactor = Math.min(1, avgBidPrice / 5000)
  return competitionFactor * 0.6 + bidFactor * 0.4
}

function calculateTrendMomentum(
  dataPoints: Array<{ date: string; ratio: number }>
): number {
  if (dataPoints.length === 0) return 0.5
  const recent = dataPoints.slice(-28)
  const recentAvg = recent.reduce((sum, p) => sum + p.ratio, 0) / recent.length
  const totalAvg = dataPoints.reduce((sum, p) => sum + p.ratio, 0) / dataPoints.length
  if (totalAvg === 0) return 0.5
  return Math.min(1, Math.max(0, recentAvg / totalAvg))
}

export function calculateOppScore(params: {
  searchVolume: number
  competition: number
  avgBidPrice: number
  trendDataPoints: Array<{ date: string; ratio: number }>
}): number {
  const sv = normalizeSearchVolume(params.searchVolume)
  const cgi = calculateCGI(params.competition, params.avgBidPrice)
  const tm = calculateTrendMomentum(params.trendDataPoints)
  return Math.round((sv * WEIGHTS.SV + cgi * WEIGHTS.CGI + tm * WEIGHTS.TM) * 10000) / 10000
}

export interface AnalyzedKeyword {
  keyword: string
  searchVolume: number
  competition: number
  cgi: number
  trendScore: number
  oppScore: number
  trend: Array<{ date: string; ratio: number }>
}

export async function analyzeKeywords(
  keywords: string[],
  adapter: KeywordAdapter
): Promise<AnalyzedKeyword[]> {
  const [statsResults, trendResults] = await Promise.all([
    adapter.getKeywordStats(keywords),
    adapter.getKeywordTrend(keywords),
  ])

  const trendMap = new Map(trendResults.map((t) => [t.keyword, t.dataPoints]))

  return statsResults.map((stat) => {
    const trendDataPoints = trendMap.get(stat.keyword) ?? []
    const cgi = calculateCGI(stat.competitionIndex, stat.averageBidPrice)
    const trendScore = calculateTrendMomentum(trendDataPoints)
    const oppScore = calculateOppScore({
      searchVolume: stat.monthlySearchVolume,
      competition: stat.competitionIndex,
      avgBidPrice: stat.averageBidPrice,
      trendDataPoints,
    })

    return {
      keyword: stat.keyword,
      searchVolume: stat.monthlySearchVolume,
      competition: stat.competitionIndex,
      cgi: Math.round(cgi * 10000) / 10000,
      trendScore: Math.round(trendScore * 10000) / 10000,
      oppScore,
      trend: trendDataPoints,
    }
  })
}
