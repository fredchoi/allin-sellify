export interface Keyword {
  id: string
  seller_id: string
  keyword: string
  search_volume: number | null
  competition: number | null
  cgi: number | null
  trend_score: number | null
  opp_score: number | null
  category: string | null
  status: 'active' | 'archived' | 'monitoring'
  last_analyzed_at: string | null
  created_at: string
  updated_at: string
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

export interface TrendStat {
  date: string
  opp_score: number | null
  search_volume: number | null
}

export interface KeywordListResponse {
  keywords: Keyword[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export type OppGrade = 'S' | 'A' | 'B' | 'C' | 'D'

export function getOppGrade(score: number | null): OppGrade {
  if (score === null) return 'D'
  if (score >= 0.8) return 'S'
  if (score >= 0.6) return 'A'
  if (score >= 0.4) return 'B'
  if (score >= 0.2) return 'C'
  return 'D'
}

export function getOppGradeColor(grade: OppGrade): string {
  switch (grade) {
    case 'S': return 'text-purple-600 bg-purple-50 border-purple-200'
    case 'A': return 'text-blue-600 bg-blue-50 border-blue-200'
    case 'B': return 'text-green-600 bg-green-50 border-green-200'
    case 'C': return 'text-yellow-600 bg-yellow-50 border-yellow-200'
    case 'D': return 'text-slate-500 bg-slate-50 border-slate-200'
  }
}

export function getOppBarColor(grade: OppGrade): string {
  switch (grade) {
    case 'S': return '#9333ea'
    case 'A': return '#2563eb'
    case 'B': return '#16a34a'
    case 'C': return '#ca8a04'
    case 'D': return '#94a3b8'
  }
}
