import { useState } from 'react'
import type { Keyword } from '../types/keyword'
import { KeywordSearchForm } from '../components/dashboard/KeywordSearchForm'
import { KeywordTable } from '../components/dashboard/KeywordTable'
import { KeywordDetailPanel } from '../components/dashboard/KeywordDetailPanel'

export function KeywordDashboard() {
  const [selectedKeyword, setSelectedKeyword] = useState<Keyword | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)

  function refresh() {
    setRefreshKey((k) => k + 1)
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* 대시보드 헤더 */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-screen-xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <a href="/" className="text-slate-400 hover:text-slate-600 transition-colors" title="랜딩 페이지">
              <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M9.293 2.293a1 1 0 0 1 1.414 0l7 7A1 1 0 0 1 17 11h-1v6a1 1 0 0 1-1 1h-2a1 1 0 0 1-1-1v-3a1 1 0 0 0-1-1H9a1 1 0 0 0-1 1v3a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-6H3a1 1 0 0 1-.707-1.707l7-7z" clipRule="evenodd" />
              </svg>
            </a>
            <div className="h-5 w-px bg-slate-200" />
            <div>
              <span className="text-sm font-semibold text-slate-800">키워드 인텔리전스</span>
              <span className="hidden sm:inline text-xs text-slate-400 ml-2">Module 01</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 hidden sm:block">개발 환경</span>
            <span className="inline-flex items-center gap-1 text-xs bg-amber-50 text-amber-600 border border-amber-200 px-2 py-1 rounded-full font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block" />
              MVP
            </span>
          </div>
        </div>
      </header>

      {/* 메인 콘텐츠 */}
      <main className="flex-1 max-w-screen-xl mx-auto w-full px-4 sm:px-6 py-6">
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-6 items-start">
          {/* 왼쪽: 검색폼 + 테이블 */}
          <div className="flex flex-col gap-5">
            <KeywordSearchForm onSaved={refresh} />
            <KeywordTable
              refreshKey={refreshKey}
              onSelect={setSelectedKeyword}
              selectedId={selectedKeyword?.id}
            />
          </div>

          {/* 오른쪽: 상세 패널 */}
          <div className="xl:sticky xl:top-[calc(3.5rem+1.5rem)]">
            <KeywordDetailPanel
              keyword={selectedKeyword}
              onClose={() => setSelectedKeyword(null)}
              onArchived={refresh}
            />
          </div>
        </div>
      </main>
    </div>
  )
}
