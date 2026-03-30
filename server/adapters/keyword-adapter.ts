export interface KeywordSearchResult {
  keyword: string
  monthlySearchVolume: number
  monthlySearchVolumePC: number
  monthlySearchVolumeMobile: number
  competitionIndex: number
  averageBidPrice: number
}

export interface KeywordTrendResult {
  keyword: string
  period: { start: string; end: string }
  dataPoints: Array<{
    date: string
    ratio: number
  }>
}

export interface KeywordAdapter {
  readonly name: string

  getKeywordStats(
    keywords: string[],
    options?: { device?: 'all' | 'pc' | 'mobile' }
  ): Promise<KeywordSearchResult[]>

  getKeywordTrend(
    keywords: string[],
    options?: { startDate?: string; endDate?: string; timeUnit?: 'date' | 'week' | 'month' }
  ): Promise<KeywordTrendResult[]>
}
