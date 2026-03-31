import { useState, useEffect } from 'react'
import {
  useListSettlements,
  useCalculateSettlement,
  useFeeRules,
  buildSummary,
  type Marketplace,
  type Settlement,
  type MarketFeeRule,
} from '../hooks/useSettlementsApi'

// ── 유틸 ──────────────────────────────────────────────────────────────────────

function formatKRW(n: number) {
  return n.toLocaleString('ko-KR') + '원'
}

function formatPct(n: number) {
  return n.toFixed(1) + '%'
}

function formatDate(s: string) {
  return new Date(s).toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' })
}

const MARKETPLACE_LABELS: Record<Marketplace, string> = {
  naver: '네이버',
  coupang: '쿠팡',
  store: '자사몰',
}

const STATUS_STYLE: Record<string, { label: string; className: string }> = {
  pending:   { label: '대기',   className: 'bg-slate-100 text-slate-600 border-slate-200' },
  confirmed: { label: '확정',   className: 'bg-blue-50 text-blue-700 border-blue-200' },
  paid:      { label: '지급완료', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  disputed:  { label: '이의',   className: 'bg-red-50 text-red-600 border-red-200' },
}

// ── KPI 카드 ──────────────────────────────────────────────────────────────────

function KpiCard({ label, value, sub, positive }: {
  label: string
  value: string
  sub?: string
  positive?: boolean
}) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <p className="text-xs text-slate-500 mb-1">{label}</p>
      <p className={`text-2xl font-semibold ${positive === false ? 'text-red-500' : positive ? 'text-emerald-600' : 'text-slate-800'}`}>
        {value}
      </p>
      {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
    </div>
  )
}

// ── 정산 행 ───────────────────────────────────────────────────────────────────

function SettlementRow({ s }: { s: Settlement }) {
  const status = STATUS_STYLE[s.settlement_status] ?? STATUS_STYLE.pending
  const marginRate = s.total_sales > 0 ? (s.net_profit / s.total_sales) * 100 : 0
  return (
    <tr className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
      <td className="py-3 px-4 text-sm text-slate-700">
        {MARKETPLACE_LABELS[s.marketplace as Marketplace] ?? s.marketplace}
      </td>
      <td className="py-3 px-4 text-sm text-slate-600">
        {formatDate(s.period_start)} ~ {formatDate(s.period_end)}
      </td>
      <td className="py-3 px-4 text-sm text-right">{formatKRW(s.total_sales)}</td>
      <td className="py-3 px-4 text-sm text-right text-slate-500">{formatKRW(s.total_commission)}</td>
      <td className="py-3 px-4 text-sm text-right text-slate-500">{formatKRW(s.total_wholesale)}</td>
      <td className={`py-3 px-4 text-sm text-right font-medium ${s.net_profit >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
        {formatKRW(s.net_profit)}
      </td>
      <td className="py-3 px-4 text-sm text-right text-slate-500">{formatPct(marginRate)}</td>
      <td className="py-3 px-4">
        <span className={`inline-flex text-xs px-1.5 py-0.5 rounded border font-medium ${status.className}`}>
          {status.label}
        </span>
      </td>
    </tr>
  )
}

// ── 수수료 규칙 행 ─────────────────────────────────────────────────────────────

function FeeRuleRow({ r }: { r: MarketFeeRule }) {
  return (
    <tr className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
      <td className="py-3 px-4 text-sm text-slate-700">
        {MARKETPLACE_LABELS[r.marketplace as Marketplace] ?? r.marketplace}
      </td>
      <td className="py-3 px-4 text-sm text-slate-600">{r.category ?? '전체'}</td>
      <td className="py-3 px-4 text-sm text-right font-medium">
        {r.fee_type === 'percentage' ? formatPct(parseFloat(r.fee_rate) * 100) : formatKRW(parseFloat(r.fee_rate))}
      </td>
      <td className="py-3 px-4 text-sm text-slate-500">{formatDate(r.effective_from)}</td>
      <td className="py-3 px-4 text-sm text-slate-500">{r.effective_to ? formatDate(r.effective_to) : '—'}</td>
    </tr>
  )
}

// ── 정산 계산 폼 ───────────────────────────────────────────────────────────────

function CalculateForm({ onDone }: { onDone: () => void }) {
  const { calculate, loading, error } = useCalculateSettlement()

  const today = new Date()
  const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0, 10)
  const todayStr = today.toISOString().slice(0, 10)

  const [marketplace, setMarketplace] = useState<Marketplace>('naver')
  const [periodStart, setPeriodStart] = useState(firstOfMonth)
  const [periodEnd, setPeriodEnd] = useState(todayStr)
  const [done, setDone] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const result = await calculate({ marketplace, periodStart, periodEnd })
    if (result) {
      setDone(true)
      onDone()
    }
  }

  if (done) {
    return (
      <div className="text-center py-4">
        <p className="text-emerald-600 font-medium">정산 계산 완료! 목록이 갱신됩니다.</p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap gap-3 items-end">
      <div>
        <label className="text-xs text-slate-500 block mb-1">마켓</label>
        <select
          value={marketplace}
          onChange={(e) => setMarketplace(e.target.value as Marketplace)}
          className="border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="naver">네이버</option>
          <option value="coupang">쿠팡</option>
          <option value="store">자사몰</option>
        </select>
      </div>
      <div>
        <label className="text-xs text-slate-500 block mb-1">시작일</label>
        <input
          type="date"
          value={periodStart}
          onChange={(e) => setPeriodStart(e.target.value)}
          required
          className="border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      <div>
        <label className="text-xs text-slate-500 block mb-1">종료일</label>
        <input
          type="date"
          value={periodEnd}
          onChange={(e) => setPeriodEnd(e.target.value)}
          required
          className="border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      <button
        type="submit"
        disabled={loading}
        className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
      >
        {loading ? '계산 중…' : '손익 계산'}
      </button>
      {error && <p className="text-red-500 text-sm w-full">{error}</p>}
    </form>
  )
}

// ── 탭 타입 ───────────────────────────────────────────────────────────────────

type Tab = 'settlements' | 'fee-rules'

// ── 메인 대시보드 ──────────────────────────────────────────────────────────────

export function SettlementsDashboard() {
  const [tab, setTab] = useState<Tab>('settlements')
  const [filterMarket, setFilterMarket] = useState<Marketplace | ''>('')
  const [showCalculate, setShowCalculate] = useState(false)

  const { settlements, total, loading, error, fetch } = useListSettlements()
  const { feeRules, loading: feeLoading, error: feeError, fetchRules } = useFeeRules()

  const summary = buildSummary(settlements)

  useEffect(() => {
    fetch({ marketplace: filterMarket || undefined })
  }, [fetch, filterMarket])

  useEffect(() => {
    if (tab === 'fee-rules') fetchRules()
  }, [tab, fetchRules])

  return (
    <div className="min-h-screen bg-slate-50">
      {/* 헤더 */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-800">정산 & 손익</h1>
          <p className="text-sm text-slate-500 mt-0.5">마켓별 정산 내역과 순이익을 관리합니다</p>
        </div>
        <button
          onClick={() => setShowCalculate(!showCalculate)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          + 정산 계산
        </button>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6 space-y-6">
        {/* 계산 폼 */}
        {showCalculate && (
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h2 className="text-sm font-medium text-slate-700 mb-4">기간별 손익 계산</h2>
            <CalculateForm onDone={() => {
              setShowCalculate(false)
              fetch({ marketplace: filterMarket || undefined })
            }} />
          </div>
        )}

        {/* KPI 카드 */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <KpiCard label="총 매출" value={formatKRW(summary.totalSales)} />
          <KpiCard label="수수료 합계" value={formatKRW(summary.totalCommission)} positive={false} />
          <KpiCard label="도매 원가" value={formatKRW(summary.totalWholesale)} positive={false} />
          <KpiCard label="순이익" value={formatKRW(summary.netProfit)} positive={summary.netProfit >= 0} />
          <KpiCard label="순이익률" value={formatPct(summary.marginRate)} positive={summary.marginRate >= 0} />
          <KpiCard label="주문 건수" value={summary.itemCount.toLocaleString() + '건'} />
        </div>

        {/* 탭 */}
        <div className="bg-white rounded-xl border border-slate-200">
          <div className="flex border-b border-slate-200">
            {(['settlements', 'fee-rules'] as Tab[]).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-5 py-3 text-sm font-medium transition-colors ${
                  tab === t
                    ? 'text-blue-600 border-b-2 border-blue-600'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {t === 'settlements' ? `정산 내역 (${total})` : '수수료 규칙'}
              </button>
            ))}
            {tab === 'settlements' && (
              <div className="ml-auto flex items-center px-4 gap-2">
                <select
                  value={filterMarket}
                  onChange={(e) => setFilterMarket(e.target.value as Marketplace | '')}
                  className="border border-slate-200 rounded-lg px-2 py-1 text-xs bg-white focus:outline-none"
                >
                  <option value="">전체 마켓</option>
                  <option value="naver">네이버</option>
                  <option value="coupang">쿠팡</option>
                  <option value="store">자사몰</option>
                </select>
              </div>
            )}
          </div>

          {/* 정산 내역 */}
          {tab === 'settlements' && (
            <div className="overflow-x-auto">
              {loading ? (
                <div className="py-12 text-center text-slate-400 text-sm">불러오는 중…</div>
              ) : error ? (
                <div className="py-12 text-center text-red-400 text-sm">{error}</div>
              ) : settlements.length === 0 ? (
                <div className="py-12 text-center">
                  <p className="text-slate-400 text-sm">정산 내역이 없습니다.</p>
                  <p className="text-slate-300 text-xs mt-1">우측 상단 '정산 계산' 버튼으로 기간 손익을 계산하세요.</p>
                </div>
              ) : (
                <table className="w-full">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      {['마켓', '기간', '매출', '수수료', '도매원가', '순이익', '이익률', '상태'].map((h) => (
                        <th key={h} className={`py-3 px-4 text-xs font-medium text-slate-500 ${['매출', '수수료', '도매원가', '순이익', '이익률'].includes(h) ? 'text-right' : 'text-left'}`}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {settlements.map((s) => <SettlementRow key={s.id} s={s} />)}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {/* 수수료 규칙 */}
          {tab === 'fee-rules' && (
            <div className="overflow-x-auto">
              {feeLoading ? (
                <div className="py-12 text-center text-slate-400 text-sm">불러오는 중…</div>
              ) : feeError ? (
                <div className="py-12 text-center text-red-400 text-sm">{feeError}</div>
              ) : feeRules.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-sm">등록된 수수료 규칙이 없습니다.</div>
              ) : (
                <table className="w-full">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      {['마켓', '카테고리', '수수료율', '적용 시작', '적용 종료'].map((h) => (
                        <th key={h} className={`py-3 px-4 text-xs font-medium text-slate-500 ${h === '수수료율' ? 'text-right' : 'text-left'}`}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {feeRules.map((r) => <FeeRuleRow key={r.id} r={r} />)}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
