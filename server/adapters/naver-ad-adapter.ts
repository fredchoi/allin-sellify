import crypto from 'crypto'
import type { KeywordAdapter, KeywordSearchResult, KeywordTrendResult } from './keyword-adapter.js'
import { config } from '../config.js'
import { AppError } from '../plugins/error-handler.js'

function buildSignature(timestamp: number, method: string, uri: string): string {
  const message = `${timestamp}.${method}.${uri}`
  return crypto
    .createHmac('sha256', config.NAVER_AD_SECRET ?? '')
    .update(message)
    .digest('base64')
}

function naverHeaders(method: string, uri: string): Record<string, string> {
  const timestamp = Date.now()
  return {
    'X-Timestamp': String(timestamp),
    'X-API-KEY': config.NAVER_AD_API_KEY ?? '',
    'X-Customer': config.NAVER_AD_CUSTOMER_ID ?? '',
    'X-Signature': buildSignature(timestamp, method, uri),
    'Content-Type': 'application/json',
  }
}

function mapCompetition(level: string): number {
  const map: Record<string, number> = { '높음': 0.8, '중간': 0.5, '낮음': 0.2 }
  return map[level] ?? 0.5
}

export class NaverAdAdapter implements KeywordAdapter {
  readonly name = 'naver-ad'

  async getKeywordStats(
    keywords: string[],
    _options?: { device?: 'all' | 'pc' | 'mobile' }
  ): Promise<KeywordSearchResult[]> {
    const uri = '/keywordstool'
    const url = new URL(`https://api.naver.com${uri}`)
    url.searchParams.set('hintKeywords', keywords.join(','))
    url.searchParams.set('showDetail', '1')

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: naverHeaders('GET', uri),
    })

    if (!response.ok) {
      throw new AppError(502, '네이버 광고 API 호출 실패', 'NAVER_AD_API_ERROR')
    }

    const data = await response.json() as { keywordList: Array<Record<string, unknown>> }
    return data.keywordList.map((item) => ({
      keyword: String(item['relKeyword']),
      monthlySearchVolume:
        Number(item['monthlyPcQcCnt']) + Number(item['monthlyMobileQcCnt']),
      monthlySearchVolumePC: Number(item['monthlyPcQcCnt']),
      monthlySearchVolumeMobile: Number(item['monthlyMobileQcCnt']),
      competitionIndex: mapCompetition(String(item['compIdx'])),
      averageBidPrice: Number(item['plAvgDepth']),
    }))
  }

  async getKeywordTrend(
    _keywords: string[],
    _options?: { startDate?: string; endDate?: string; timeUnit?: 'date' | 'week' | 'month' }
  ): Promise<KeywordTrendResult[]> {
    // 네이버 광고 API는 트렌드를 제공하지 않음 — DataLab 어댑터 사용
    return []
  }
}
