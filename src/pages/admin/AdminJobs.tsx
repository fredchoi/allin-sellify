import { useState, useEffect, useCallback, useRef } from 'react'
import { Card } from '../../components/ui/Card'
import { useAdminJobs, useRetryJob } from '../../hooks/useAdminApi'

const statusOptions = [
  { value: 'all', label: '전체' },
  { value: 'pending', label: '대기' },
  { value: 'processing', label: '처리중' },
  { value: 'completed', label: '완료' },
  { value: 'failed', label: '실패' },
]

const statusBadge: Record<string, { bg: string; text: string; label: string }> = {
  pending: { bg: 'bg-blue-100', text: 'text-blue-700', label: '대기' },
  processing: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: '처리중' },
  completed: { bg: 'bg-green-100', text: 'text-green-700', label: '완료' },
  failed: { bg: 'bg-red-100', text: 'text-red-700', label: '실패' },
}

export function AdminJobs() {
  const [page, setPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState('all')
  const [queueFilter, setQueueFilter] = useState('')
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const { jobs, total, loading, error, fetch: fetchJobs } = useAdminJobs()
  const { retry: retryJob, loading: retrying } = useRetryJob()

  const loadJobs = useCallback(() => {
    fetchJobs(page, { status: statusFilter, queue: queueFilter || undefined })
  }, [fetchJobs, page, statusFilter, queueFilter])

  useEffect(() => {
    loadJobs()
  }, [loadJobs])

  // 10초 자동 새로고침
  useEffect(() => {
    intervalRef.current = setInterval(() => {
      loadJobs()
    }, 10000)

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [loadJobs])

  async function handleRetry(jobId: string) {
    const success = await retryJob(jobId)
    if (success) {
      loadJobs()
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / 20))

  return (
    <div className="space-y-6">
      {/* 필터 영역 */}
      <Card>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end">
          {/* 상태 필터 */}
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">상태</label>
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1) }}
              className="rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
            >
              {statusOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          {/* 큐 필터 */}
          <div className="flex-1">
            <label className="mb-1 block text-sm font-medium text-slate-700">큐 이름</label>
            <input
              type="text"
              value={queueFilter}
              onChange={(e) => { setQueueFilter(e.target.value); setPage(1) }}
              placeholder="큐 이름으로 필터링"
              className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
            />
          </div>

          {/* 자동 새로고침 표시 */}
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
            </span>
            10초마다 자동 갱신
          </div>
        </div>
      </Card>

      {/* 에러 표시 */}
      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* 잡 테이블 */}
      <Card>
        <div className="overflow-x-auto">
          {loading && jobs.length === 0 ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="animate-pulse flex gap-4">
                  <div className="h-4 w-20 rounded bg-slate-200" />
                  <div className="h-4 w-28 rounded bg-slate-200" />
                  <div className="h-4 w-16 rounded bg-slate-200" />
                  <div className="h-4 w-12 rounded bg-slate-200" />
                  <div className="h-4 w-32 rounded bg-slate-200" />
                  <div className="h-4 w-24 rounded bg-slate-200" />
                </div>
              ))}
            </div>
          ) : jobs.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-500">잡이 없습니다</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left text-slate-500">
                  <th className="pb-2 pr-4 font-medium">큐</th>
                  <th className="pb-2 pr-4 font-medium">잡 이름</th>
                  <th className="pb-2 pr-4 font-medium">상태</th>
                  <th className="pb-2 pr-4 font-medium">시도</th>
                  <th className="pb-2 pr-4 font-medium">에러</th>
                  <th className="pb-2 pr-4 font-medium">생성</th>
                  <th className="pb-2 pr-4 font-medium">시작</th>
                  <th className="pb-2 pr-4 font-medium">완료</th>
                  <th className="pb-2 font-medium">액션</th>
                </tr>
              </thead>
              <tbody>
                {jobs.map((job) => {
                  const badge = statusBadge[job.status] ?? statusBadge.pending
                  return (
                    <tr key={job.id} className="border-b border-slate-50 last:border-0">
                      <td className="py-2.5 pr-4 font-mono text-xs text-slate-600">{job.queue}</td>
                      <td className="py-2.5 pr-4 text-slate-900">{job.name}</td>
                      <td className="py-2.5 pr-4">
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${badge.bg} ${badge.text}`}>
                          {badge.label}
                        </span>
                      </td>
                      <td className="py-2.5 pr-4 text-center text-slate-600">{job.attempts}</td>
                      <td className="py-2.5 pr-4 max-w-[200px] truncate text-xs text-red-600" title={job.error ?? ''}>
                        {job.error ?? '-'}
                      </td>
                      <td className="py-2.5 pr-4 text-xs text-slate-500">{formatDateTime(job.created_at)}</td>
                      <td className="py-2.5 pr-4 text-xs text-slate-500">{formatDateTime(job.started_at)}</td>
                      <td className="py-2.5 pr-4 text-xs text-slate-500">{formatDateTime(job.completed_at)}</td>
                      <td className="py-2.5">
                        {job.status === 'failed' && (
                          <button
                            onClick={() => handleRetry(job.id)}
                            disabled={retrying}
                            className="rounded-lg bg-purple-50 px-3 py-1 text-xs font-medium text-purple-600 hover:bg-purple-100 transition-colors disabled:opacity-50"
                          >
                            재시도
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* 페이지네이션 */}
        {totalPages > 1 && (
          <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-4">
            <p className="text-sm text-slate-500">
              총 {total}건 중 {(page - 1) * 20 + 1}-{Math.min(page * 20, total)}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-50"
              >
                이전
              </button>
              <span className="flex items-center px-2 text-sm text-slate-600">
                {page} / {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-50"
              >
                다음
              </button>
            </div>
          </div>
        )}
      </Card>
    </div>
  )
}

function formatDateTime(value: string | null): string {
  if (!value) return '-'
  try {
    const d = new Date(value)
    return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  } catch {
    return value
  }
}
