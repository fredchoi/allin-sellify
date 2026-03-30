import { useState, useCallback } from 'react'
import type { Keyword, AnalyzedKeyword, KeywordListResponse, TrendStat } from '../types/keyword'

// 개발용 임시 sellerId (실제 서비스에서는 인증에서 주입)
const DEV_SELLER_ID = '00000000-0000-0000-0000-000000000001'

export function useSellerId() {
  return DEV_SELLER_ID
}

export function useKeywordAnalyze() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const analyze = useCallback(async (keywords: string[]): Promise<AnalyzedKeyword[]> => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/keywords/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keywords, sellerId: DEV_SELLER_ID }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.message ?? `서버 오류 (${res.status})`)
      }
      const data = await res.json()
      return data.results as AnalyzedKeyword[]
    } catch (e) {
      const msg = e instanceof Error ? e.message : '알 수 없는 오류'
      setError(msg)
      throw e
    } finally {
      setLoading(false)
    }
  }, [])

  return { analyze, loading, error }
}

export function useKeywordSave() {
  const [loading, setLoading] = useState(false)

  const save = useCallback(async (analyzed: AnalyzedKeyword): Promise<Keyword> => {
    setLoading(true)
    try {
      const res = await fetch('/api/keywords', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sellerId: DEV_SELLER_ID,
          keyword: analyzed.keyword,
          searchVolume: analyzed.searchVolume,
          competition: analyzed.competition,
          cgi: analyzed.cgi,
          trendScore: analyzed.trendScore,
          oppScore: analyzed.oppScore,
        }),
      })
      if (!res.ok) throw new Error(`저장 실패 (${res.status})`)
      return await res.json()
    } finally {
      setLoading(false)
    }
  }, [])

  return { save, loading }
}

export function useKeywordList(
  sort: 'opp_score' | 'search_volume' | 'created_at' = 'opp_score',
  status?: 'active' | 'archived' | 'monitoring'
) {
  const [data, setData] = useState<KeywordListResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetch_ = useCallback(
    async (page = 1) => {
      setLoading(true)
      setError(null)
      try {
        const params = new URLSearchParams({
          sellerId: DEV_SELLER_ID,
          sort,
          page: String(page),
          limit: '20',
        })
        if (status) params.set('status', status)

        const res = await fetch(`/api/keywords?${params}`)
        if (!res.ok) throw new Error(`목록 조회 실패 (${res.status})`)
        const json = await res.json()
        setData(json)
        return json as KeywordListResponse
      } catch (e) {
        const msg = e instanceof Error ? e.message : '알 수 없는 오류'
        setError(msg)
        throw e
      } finally {
        setLoading(false)
      }
    },
    [sort, status]
  )

  return { data, loading, error, refetch: fetch_ }
}

export function useKeywordDetail(_id: string | null) {
  const [keyword, setKeyword] = useState<Keyword | null>(null)
  const [trend, setTrend] = useState<TrendStat[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetch_ = useCallback(async (targetId: string) => {
    setLoading(true)
    setError(null)
    try {
      const [kwRes, trendRes] = await Promise.all([
        fetch(`/api/keywords/${targetId}`),
        fetch(`/api/keywords/${targetId}/trend`),
      ])
      if (!kwRes.ok) throw new Error('키워드 조회 실패')
      const [kw, trendData] = await Promise.all([kwRes.json(), trendRes.json()])
      setKeyword(kw)
      setTrend((trendData.stats as TrendStat[]).slice().reverse())
    } catch (e) {
      const msg = e instanceof Error ? e.message : '알 수 없는 오류'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }, [])

  const archive = useCallback(async (targetId: string) => {
    const res = await fetch(`/api/keywords/${targetId}`, { method: 'DELETE' })
    if (!res.ok) throw new Error('삭제 실패')
  }, [])

  return { keyword, trend, loading, error, loadDetail: fetch_, archive }
}
