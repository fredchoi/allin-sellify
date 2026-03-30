import { useEffect } from 'react'
import type { Keyword } from '../../types/keyword'
import { getOppGrade, getOppGradeColor } from '../../types/keyword'
import { useKeywordDetail } from '../../hooks/useKeywordApi'
import { TrendLineChart } from './TrendLineChart'
import { cn } from '../../lib/utils'

interface Props {
  keyword: Keyword | null
  onClose: () => void
  onArchived: () => void
}

function MetricRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center py-2 border-b border-slate-50 last:border-0">
      <span className="text-xs text-slate-500">{label}</span>
      <span className="text-sm font-medium text-slate-800">{value}</span>
    </div>
  )
}

export function KeywordDetailPanel({ keyword, onClose, onArchived }: Props) {
  const { keyword: detail, trend, loading, error, loadDetail, archive } = useKeywordDetail(keyword?.id ?? null)

  useEffect(() => {
    if (keyword?.id) loadDetail(keyword.id)
  }, [keyword?.id, loadDetail])

  if (!keyword) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm h-full flex items-center justify-center text-slate-400 text-sm p-8 text-center">
        <div>
          <p className="font-medium mb-1">키워드를 선택하세요</p>
          <p className="text-xs">목록에서 키워드를 클릭하면<br />상세 정보가 여기에 표시됩니다</p>
        </div>
      </div>
    )
  }

  const kw = detail ?? keyword
  const grade = getOppGrade(kw.opp_score)
  const gradeColor = getOppGradeColor(grade)

  async function handleArchive() {
    if (!kw.id) return
    if (!confirm(`"${kw.keyword}"을(를) 보관하시겠습니까?`)) return
    await archive(kw.id)
    onArchived()
    onClose()
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col h-full">
      {/* 헤더 */}
      <div className="p-4 border-b border-slate-100 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span
              className={cn(
                'inline-flex items-center justify-center w-8 h-8 rounded-lg border-2 text-sm font-bold shrink-0',
                gradeColor
              )}
            >
              {grade}
            </span>
            <h3 className="font-semibold text-slate-800 truncate">{kw.keyword}</h3>
          </div>
          {kw.category && (
            <span className="text-xs text-slate-400 ml-10">{kw.category}</span>
          )}
        </div>
        <button
          onClick={onClose}
          className="shrink-0 text-slate-400 hover:text-slate-600 transition-colors p-1 -mr-1 -mt-1"
          aria-label="닫기"
        >
          <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
            <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22z" />
          </svg>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading && (
          <div className="flex justify-center py-8 text-slate-400 text-sm">
            <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          </div>
        )}
        {error && (
          <p className="p-4 text-xs text-red-500">{error}</p>
        )}

        {/* 지표 */}
        <div className="p-4 border-b border-slate-100">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">지표</p>
          <MetricRow
            label="OPP 스코어"
            value={kw.opp_score !== null ? `${Math.round(kw.opp_score * 100)}점` : '—'}
          />
          <MetricRow
            label="월간 검색량"
            value={kw.search_volume?.toLocaleString() ?? '—'}
          />
          <MetricRow
            label="경쟁도"
            value={kw.competition !== null ? `${Math.round(kw.competition * 100)}%` : '—'}
          />
          <MetricRow
            label="CGI"
            value={kw.cgi !== null ? `${Math.round(kw.cgi * 100)}%` : '—'}
          />
          <MetricRow
            label="트렌드"
            value={kw.trend_score !== null ? `${Math.round(kw.trend_score * 100)}%` : '—'}
          />
          <MetricRow
            label="마지막 분석"
            value={
              kw.last_analyzed_at
                ? new Date(kw.last_analyzed_at).toLocaleDateString('ko-KR')
                : '—'
            }
          />
        </div>

        {/* 트렌드 차트 */}
        <div className="p-4">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">트렌드 (90일)</p>
          <TrendLineChart stats={trend} height={180} />
        </div>
      </div>

      {/* 액션 */}
      <div className="p-4 border-t border-slate-100">
        <button
          onClick={handleArchive}
          className="w-full text-xs font-medium text-slate-500 hover:text-red-500 border border-slate-200 hover:border-red-200 rounded-lg py-2 transition-all"
        >
          보관함으로 이동
        </button>
      </div>
    </div>
  )
}
