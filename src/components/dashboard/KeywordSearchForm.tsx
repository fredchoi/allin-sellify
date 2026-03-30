import { useState } from 'react'
import type { AnalyzedKeyword } from '../../types/keyword'
import { useKeywordAnalyze, useKeywordSave } from '../../hooks/useKeywordApi'
import { OppScoreBar } from './OppScoreBar'
import { cn } from '../../lib/utils'

interface Props {
  onSaved: () => void
}

export function KeywordSearchForm({ onSaved }: Props) {
  const [input, setInput] = useState('')
  const [results, setResults] = useState<AnalyzedKeyword[]>([])
  const [saving, setSaving] = useState<Set<string>>(new Set())
  const [saved, setSaved] = useState<Set<string>>(new Set())
  const { analyze, loading, error } = useKeywordAnalyze()
  const { save } = useKeywordSave()

  function parseKeywords(raw: string): string[] {
    return raw
      .split(/[\n,]/)
      .map((k) => k.trim())
      .filter(Boolean)
      .slice(0, 5)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const keywords = parseKeywords(input)
    if (keywords.length === 0) return
    setResults([])
    setSaved(new Set())
    const res = await analyze(keywords).catch(() => [])
    setResults(res)
  }

  async function handleSave(keyword: AnalyzedKeyword) {
    setSaving((prev) => new Set(prev).add(keyword.keyword))
    try {
      await save(keyword)
      setSaved((prev) => new Set(prev).add(keyword.keyword))
      onSaved()
    } catch {
      // 에러 무시 (UI에서 이미 보여줌)
    } finally {
      setSaving((prev) => {
        const next = new Set(prev)
        next.delete(keyword.keyword)
        return next
      })
    }
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
      <div className="p-5 border-b border-slate-100">
        <h2 className="text-base font-semibold text-slate-800">키워드 분석</h2>
        <p className="text-xs text-slate-500 mt-0.5">최대 5개까지 입력 (쉼표 또는 줄바꿈으로 구분)</p>
      </div>

      <form onSubmit={handleSubmit} className="p-5 space-y-4">
        <div className="flex gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="예: 무선 이어폰, 블루투스 스피커"
            rows={3}
            className="flex-1 resize-none rounded-lg border border-slate-200 px-3 py-2 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className={cn(
              'self-stretch px-5 rounded-lg text-sm font-semibold transition-all',
              loading || !input.trim()
                ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            )}
          >
            {loading ? (
              <span className="flex items-center gap-1.5">
                <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                분석 중
              </span>
            ) : '분석'}
          </button>
        </div>

        {error && (
          <p className="text-xs text-red-500 bg-red-50 rounded-lg px-3 py-2">{error}</p>
        )}
      </form>

      {results.length > 0 && (
        <div className="border-t border-slate-100">
          <div className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
            분석 결과
          </div>
          <div className="divide-y divide-slate-50">
            {results.map((r) => (
              <div key={r.keyword} className="px-5 py-3.5 flex items-center gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-medium text-sm text-slate-800 truncate">{r.keyword}</span>
                    <span className="text-xs text-slate-400 shrink-0">
                      검색량 {r.searchVolume.toLocaleString()}
                    </span>
                  </div>
                  <OppScoreBar score={r.oppScore} size="sm" />
                  <div className="flex gap-4 mt-1.5 text-xs text-slate-400">
                    <span>경쟁도 {Math.round(r.competition * 100)}%</span>
                    <span>CGI {Math.round(r.cgi * 100)}%</span>
                    <span>트렌드 {Math.round(r.trendScore * 100)}%</span>
                  </div>
                </div>
                <button
                  onClick={() => handleSave(r)}
                  disabled={saving.has(r.keyword) || saved.has(r.keyword)}
                  className={cn(
                    'shrink-0 text-xs px-3 py-1.5 rounded-lg font-medium transition-all',
                    saved.has(r.keyword)
                      ? 'bg-green-50 text-green-600 cursor-default'
                      : saving.has(r.keyword)
                      ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                      : 'bg-blue-50 text-blue-600 hover:bg-blue-100'
                  )}
                >
                  {saved.has(r.keyword) ? '저장됨' : saving.has(r.keyword) ? '저장 중' : '저장'}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
