import { useEffect, useState, useCallback } from 'react'
import { useKeywordList } from '../../hooks/useKeywordApi'
import type { Keyword } from '../../types/keyword'
import { OppScoreBar } from './OppScoreBar'
import { cn } from '../../lib/utils'

type SortField = 'opp_score' | 'search_volume' | 'created_at'
type StatusFilter = 'active' | 'archived' | 'monitoring' | undefined

interface Props {
  refreshKey?: number
  onSelect: (keyword: Keyword) => void
  selectedId?: string | null
}

const STATUS_LABELS: Record<NonNullable<StatusFilter>, string> = {
  active: '활성',
  monitoring: '모니터링',
  archived: '보관',
}

export function KeywordTable({ refreshKey, onSelect, selectedId }: Props) {
  const [sort, setSort] = useState<SortField>('opp_score')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(undefined)
  const { data, loading, error, refetch } = useKeywordList(sort, statusFilter)

  const reload = useCallback(() => refetch(1), [refetch])

  useEffect(() => {
    reload()
  }, [sort, statusFilter, refreshKey, reload])

  function handleSort(field: SortField) {
    setSort(field)
  }

  const SortButton = ({ field, label }: { field: SortField; label: string }) => (
    <button
      onClick={() => handleSort(field)}
      className={cn(
        'text-xs font-medium px-2.5 py-1 rounded-md transition-all',
        sort === field
          ? 'bg-blue-600 text-white'
          : 'text-slate-500 hover:bg-slate-100'
      )}
    >
      {label}
    </button>
  )

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col min-h-0">
      {/* 헤더 */}
      <div className="p-4 border-b border-slate-100 flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-base font-semibold text-slate-800">저장된 키워드</h2>
        <div className="flex items-center gap-2">
          {/* 상태 필터 */}
          <div className="flex items-center gap-1 bg-slate-50 rounded-lg p-1 border border-slate-100">
            <button
              onClick={() => setStatusFilter(undefined)}
              className={cn(
                'text-xs px-2.5 py-1 rounded-md transition-all font-medium',
                statusFilter === undefined ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              )}
            >
              전체
            </button>
            {(Object.keys(STATUS_LABELS) as NonNullable<StatusFilter>[]).map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={cn(
                  'text-xs px-2.5 py-1 rounded-md transition-all font-medium',
                  statusFilter === s ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                )}
              >
                {STATUS_LABELS[s]}
              </button>
            ))}
          </div>
          {/* 정렬 */}
          <div className="flex items-center gap-1">
            <SortButton field="opp_score" label="OPP" />
            <SortButton field="search_volume" label="검색량" />
            <SortButton field="created_at" label="최신" />
          </div>
        </div>
      </div>

      {/* 테이블 */}
      <div className="overflow-auto flex-1">
        {loading && (
          <div className="flex justify-center items-center py-16 text-slate-400 text-sm">
            <svg className="animate-spin w-5 h-5 mr-2" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            불러오는 중...
          </div>
        )}
        {error && !loading && (
          <div className="flex flex-col items-center py-16 text-red-500 text-sm gap-2">
            <span>{error}</span>
            <button onClick={reload} className="text-xs text-blue-600 hover:underline">
              다시 시도
            </button>
          </div>
        )}
        {!loading && !error && data && data.keywords.length === 0 && (
          <div className="flex flex-col items-center py-16 text-slate-400 text-sm gap-1">
            <span>저장된 키워드가 없습니다</span>
            <span className="text-xs">위에서 키워드를 분석하고 저장해 보세요</span>
          </div>
        )}
        {!loading && !error && data && data.keywords.length > 0 && (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="text-left text-xs font-medium text-slate-400 px-4 py-2.5">키워드</th>
                <th className="text-left text-xs font-medium text-slate-400 px-4 py-2.5 w-48">OPP 스코어</th>
                <th className="text-right text-xs font-medium text-slate-400 px-4 py-2.5 hidden sm:table-cell">검색량</th>
                <th className="text-right text-xs font-medium text-slate-400 px-4 py-2.5 hidden md:table-cell">경쟁도</th>
                <th className="text-center text-xs font-medium text-slate-400 px-4 py-2.5 hidden lg:table-cell">상태</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {data.keywords.map((kw) => (
                <tr
                  key={kw.id}
                  onClick={() => onSelect(kw)}
                  className={cn(
                    'cursor-pointer transition-colors',
                    selectedId === kw.id
                      ? 'bg-blue-50'
                      : 'hover:bg-slate-50'
                  )}
                >
                  <td className="px-4 py-3 font-medium text-slate-800 max-w-[140px] truncate">
                    {kw.keyword}
                  </td>
                  <td className="px-4 py-3 w-48">
                    <OppScoreBar score={kw.opp_score} size="sm" />
                  </td>
                  <td className="px-4 py-3 text-right text-slate-500 tabular-nums hidden sm:table-cell">
                    {kw.search_volume?.toLocaleString() ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-right text-slate-500 hidden md:table-cell">
                    {kw.competition !== null ? `${Math.round(kw.competition * 100)}%` : '—'}
                  </td>
                  <td className="px-4 py-3 text-center hidden lg:table-cell">
                    <span
                      className={cn(
                        'text-xs px-2 py-0.5 rounded-full font-medium',
                        kw.status === 'active' && 'bg-green-50 text-green-600',
                        kw.status === 'monitoring' && 'bg-blue-50 text-blue-600',
                        kw.status === 'archived' && 'bg-slate-100 text-slate-500'
                      )}
                    >
                      {STATUS_LABELS[kw.status] ?? kw.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* 페이지네이션 */}
      {data && data.pagination.totalPages > 1 && (
        <div className="p-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <span>총 {data.pagination.total}개</span>
          <div className="flex gap-1">
            {Array.from({ length: data.pagination.totalPages }, (_, i) => i + 1).map((p) => (
              <button
                key={p}
                onClick={() => refetch(p)}
                className={cn(
                  'w-7 h-7 rounded flex items-center justify-center font-medium transition-all',
                  data.pagination.page === p
                    ? 'bg-blue-600 text-white'
                    : 'hover:bg-slate-100 text-slate-500'
                )}
              >
                {p}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
