import { useState, useEffect } from 'react'
import {
  useInventoryList,
  useInventorySync,
  type InventorySyncJob,
  type Tier,
  type SyncStatus,
} from '../hooks/useInventoryApi'

// ── 유틸 ──────────────────────────────────────────────────────────────────────

function timeAgo(s: string | null): string {
  if (!s) return '—'
  const diff = Math.floor((Date.now() - new Date(s).getTime()) / 1000)
  if (diff < 60) return `${diff}초 전`
  if (diff < 3600) return `${Math.floor(diff / 60)}분 전`
  if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전`
  return `${Math.floor(diff / 86400)}일 전`
}

function timeUntil(s: string | null): string {
  if (!s) return '즉시'
  const diff = Math.floor((new Date(s).getTime() - Date.now()) / 1000)
  if (diff <= 0) return '즉시'
  if (diff < 60) return `${diff}초 후`
  if (diff < 3600) return `${Math.floor(diff / 60)}분 후`
  return `${Math.floor(diff / 3600)}시간 후`
}

// ── Tier 뱃지 ─────────────────────────────────────────────────────────────────

const TIER_STYLE: Record<Tier, { label: string; interval: string; className: string }> = {
  tier1: { label: 'Tier 1', interval: '10분', className: 'bg-red-50 text-red-600 border-red-200' },
  tier2: { label: 'Tier 2', interval: '30분', className: 'bg-amber-50 text-amber-600 border-amber-200' },
  tier3: { label: 'Tier 3', interval: '6시간', className: 'bg-slate-100 text-slate-500 border-slate-200' },
}

function TierBadge({ tier }: { tier: Tier }) {
  const s = TIER_STYLE[tier]
  return (
    <span className={`inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded border font-medium ${s.className}`}>
      {s.label} <span className="font-normal opacity-70">({s.interval})</span>
    </span>
  )
}

// ── 상태 뱃지 ─────────────────────────────────────────────────────────────────

const STATUS_STYLE: Record<SyncStatus, { label: string; className: string }> = {
  active:  { label: '활성',   className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  paused:  { label: '일시정지', className: 'bg-slate-100 text-slate-500 border-slate-200' },
  error:   { label: '오류',   className: 'bg-red-50 text-red-600 border-red-200' },
}

// ── KPI 카드 ──────────────────────────────────────────────────────────────────

function KpiCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <p className="text-xs text-slate-500 mb-1">{label}</p>
      <p className="text-2xl font-semibold text-slate-800">{value}</p>
      {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
    </div>
  )
}

// ── 재고 행 ───────────────────────────────────────────────────────────────────

function InventoryRow({
  job,
  onTierChange,
}: {
  job: InventorySyncJob
  onTierChange: (id: string, tier: Tier) => void
}) {
  const status = STATUS_STYLE[job.status] ?? STATUS_STYLE.active
  const qty = job.stock_quantity ?? 0

  return (
    <tr className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
      <td className="py-3 px-4 text-sm text-slate-700 max-w-[200px] truncate">
        {job.product_name ?? '—'}
      </td>
      <td className="py-3 px-4">
        <TierBadge tier={job.tier} />
      </td>
      <td className={`py-3 px-4 text-sm font-medium text-right ${qty <= 5 ? 'text-red-500' : qty <= 20 ? 'text-amber-600' : 'text-slate-800'}`}>
        {qty.toLocaleString()}개
      </td>
      <td className="py-3 px-4 text-xs text-slate-500">{timeAgo(job.last_polled_at)}</td>
      <td className="py-3 px-4 text-xs text-slate-500">{timeUntil(job.next_poll_at)}</td>
      <td className="py-3 px-4 text-sm text-slate-500">{job.poll_count}회</td>
      <td className="py-3 px-4">
        <span className={`inline-flex text-xs px-1.5 py-0.5 rounded border font-medium ${status.className}`}>
          {status.label}
        </span>
      </td>
      <td className="py-3 px-4">
        {job.last_error && (
          <span className="text-xs text-red-500 truncate max-w-[120px] block" title={job.last_error}>
            {job.last_error}
          </span>
        )}
      </td>
      <td className="py-3 px-4">
        <select
          value={job.tier}
          onChange={(e) => onTierChange(job.id, e.target.value as Tier)}
          className="text-xs border border-slate-200 rounded px-1.5 py-0.5 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          <option value="tier1">Tier 1 (10분)</option>
          <option value="tier2">Tier 2 (30분)</option>
          <option value="tier3">Tier 3 (6시간)</option>
        </select>
      </td>
    </tr>
  )
}

// ── 메인 페이지 ───────────────────────────────────────────────────────────────

export function InventoryPage() {
  const [filterTier, setFilterTier] = useState<Tier | ''>('')
  const [filterStatus, setFilterStatus] = useState<SyncStatus | ''>('')

  const { jobs, total, loading, error, fetch } = useInventoryList()
  const { status: queueStatus, triggering, message, fetchStatus, trigger, updateTier } = useInventorySync()

  useEffect(() => {
    fetch({ tier: filterTier || undefined, status: filterStatus || undefined })
  }, [fetch, filterTier, filterStatus])

  useEffect(() => {
    fetchStatus()
    const timer = setInterval(fetchStatus, 30000)
    return () => clearInterval(timer)
  }, [fetchStatus])

  const handleTierChange = async (jobId: string, tier: Tier) => {
    const ok = await updateTier(jobId, tier)
    if (ok) fetch({ tier: filterTier || undefined, status: filterStatus || undefined })
  }

  // Tier 집계
  const t1 = jobs.filter((j) => j.tier === 'tier1').length
  const t2 = jobs.filter((j) => j.tier === 'tier2').length
  const t3 = jobs.filter((j) => j.tier === 'tier3').length
  const errCount = jobs.filter((j) => j.status === 'error').length

  return (
    <div className="min-h-screen bg-slate-50">
      {/* 헤더 */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-800">재고 동기화</h1>
          <p className="text-sm text-slate-500 mt-0.5">Tier별 폴링 스케줄을 관리합니다</p>
        </div>
        <button
          onClick={trigger}
          disabled={triggering}
          className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          {triggering ? '동기화 중…' : '수동 동기화'}
        </button>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6 space-y-6">
        {/* 메시지 */}
        {message && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 text-sm text-blue-700">
            {message}
          </div>
        )}

        {/* KPI 카드 */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
          <KpiCard label="전체" value={total} />
          <KpiCard label="Tier 1 (긴급)" value={t1} sub="10분 폴링" />
          <KpiCard label="Tier 2 (판매중)" value={t2} sub="30분 폴링" />
          <KpiCard label="Tier 3 (유휴)" value={t3} sub="6시간 폴링" />
          <KpiCard label="오류" value={errCount} />
          {queueStatus && (
            <>
              <KpiCard label="큐 대기" value={queueStatus.waiting} />
              <KpiCard label="큐 처리중" value={queueStatus.active} />
            </>
          )}
        </div>

        {/* 테이블 */}
        <div className="bg-white rounded-xl border border-slate-200">
          {/* 필터 */}
          <div className="flex items-center gap-3 p-4 border-b border-slate-200">
            <span className="text-sm font-medium text-slate-600">필터:</span>
            <select
              value={filterTier}
              onChange={(e) => setFilterTier(e.target.value as Tier | '')}
              className="border border-slate-200 rounded-lg px-2 py-1 text-sm bg-white focus:outline-none"
            >
              <option value="">전체 Tier</option>
              <option value="tier1">Tier 1</option>
              <option value="tier2">Tier 2</option>
              <option value="tier3">Tier 3</option>
            </select>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as SyncStatus | '')}
              className="border border-slate-200 rounded-lg px-2 py-1 text-sm bg-white focus:outline-none"
            >
              <option value="">전체 상태</option>
              <option value="active">활성</option>
              <option value="paused">일시정지</option>
              <option value="error">오류</option>
            </select>
            <span className="text-xs text-slate-400 ml-auto">{total}개 항목</span>
          </div>

          <div className="overflow-x-auto">
            {loading ? (
              <div className="py-12 text-center text-slate-400 text-sm">불러오는 중…</div>
            ) : error ? (
              <div className="py-12 text-center text-red-400 text-sm">{error}</div>
            ) : jobs.length === 0 ? (
              <div className="py-12 text-center">
                <p className="text-slate-400 text-sm">재고 동기화 항목이 없습니다.</p>
                <p className="text-slate-300 text-xs mt-1">상품을 수집하면 자동으로 동기화 작업이 생성됩니다.</p>
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    {['상품명', 'Tier', '재고', '마지막 폴링', '다음 폴링', '폴링 횟수', '상태', '오류', 'Tier 변경'].map((h) => (
                      <th key={h} className={`py-3 px-4 text-xs font-medium text-slate-500 text-left ${h === '재고' ? 'text-right' : ''}`}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {jobs.map((job) => (
                    <InventoryRow key={job.id} job={job} onTierChange={handleTierChange} />
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
