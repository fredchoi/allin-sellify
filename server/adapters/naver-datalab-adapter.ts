import type { KeywordAdapter, KeywordSearchResult, KeywordTrendResult } from './keyword-adapter.js'
import { config } from '../config.js'
import { AppError } from '../plugins/error-handler.js'

export class NaverDataLabAdapter implements KeywordAdapter {
  readonly name = 'naver-datalab'

  async getKeywordStats(
    _keywords: string[],
    _options?: { device?: 'all' | 'pc' | 'mobile' }
  ): Promise<KeywordSearchResult[]> {
    // DataLab는 트렌드 전용 — 검색량/경쟁도는 NaverAdAdapter 사용
    return []
  }

  async getKeywordTrend(
    keywords: string[],
    options?: { startDate?: string; endDate?: string; timeUnit?: 'date' | 'week' | 'month' }
  ): Promise<KeywordTrendResult[]> {
    const now = new Date()
    const startDate = options?.startDate ?? this.formatDate(new Date(now.getFullYear(), now.getMonth() - 3, 1))
    const endDate = options?.endDate ?? this.formatDate(now)
    const timeUnit = options?.timeUnit ?? 'date'

    const body = {
      startDate,
      endDate,
      timeUnit,
      keywordGroups: keywords.map((kw) => ({
        groupName: kw,
        keywords: [kw],
      })),
    }

    const response = await fetch('https://openapi.naver.com/v1/datalab/search', {
      method: 'POST',
      headers: {
        'X-Naver-Client-Id': config.NAVER_DATALAB_CLIENT_ID ?? '',
        'X-Naver-Client-Secret': config.NAVER_DATALAB_CLIENT_SECRET ?? '',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      throw new AppError(502, '네이버 DataLab API 호출 실패', 'NAVER_DATALAB_API_ERROR')
    }

    const data = await response.json() as {
      results: Array<{
        title: string
        keywords: string[]
        data: Array<{ period: string; ratio: number }>
      }>
    }

    return data.results.map((result) => ({
      keyword: result.title,
      period: { start: startDate, end: endDate },
      dataPoints: result.data.map((d) => ({
        date: d.period,
        ratio: d.ratio,
      })),
    }))
  }

  private formatDate(date: Date): string {
    return date.toISOString().split('T')[0]
  }
}
