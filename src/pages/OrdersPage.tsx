import { useState, useEffect } from 'react'
import {
  useOrderList,
  useOrderStats,
  useOrderActions,
  type Order,
  type OrderStatus,
  type Marketplace,
} from '../hooks/useOrdersApi'

// ── 유틸 ──────────────────────────────────────────────────────────────────────

function formatKRW(n: number) {
  return n.toLocaleString('ko-KR') + '원'
}

function formatDate(s: string | null) {
  if (!s) return '—'
  return new Date(s).toLocaleDateString('ko-KR', {
    month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
  })
}

const MARKETPLACE_LABELS: Record<Marketplace, string> = {
  naver: '네이버',
  coupang: '쿠팡',
  store: '자사몰',
}

const STATUS_STYLE: Record<string, { label: string; className: string }> = {
  new:       { label: '신규',    className: 'bg-blue-50 text-blue-700 border-blue-200' },
  confirmed: { label: '확인',    className: 'bg-indigo-50 text-indigo-600 border-indigo-200' },
  preparing: { label: '준비중',  className: 'bg-amber-50 text-amber-600 border-amber-200' },
  shipping:  { label: '배송중',  className: 'bg-sky-50 text-sky-600 border-sky-200' },
  delivered: { label: '배송완료', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  cancelled: { label: '취소',    className: 'bg-slate-100 text-slate-500 border-slate-200' },
  returned:  { label: '반품',    className: 'bg-red-50 text-red-500 border-red-200' },
  exchanged: { label: '교환',    className: 'bg-purple-50 text-purple-600 border-purple-200' },
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

// ── 송장 입력 모달 ─────────────────────────────────────────────────────────────

function TrackingModal({
  orderId,
  onClose,
  onSubmit,
}: {
  orderId: string
  onClose: () => void
  onSubmit: (carrier: string, trackingNumber: string) => Promise<void>
}) {
  const [carrier, setCarrier] = useState('CJ대한통운')
  const [trackingNumber, setTrackingNumber] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    await onSubmit(carrier, trackingNumber)
    setSubmitting(false)
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-2xl p-6 w-96 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-semibold text-slate-800 mb-4">송장 등록</h2>
        <p className="text-xs text-slate-400 mb-4">주문 ID: {orderId.slice(0, 8)}…</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs text-slate-500 block mb-1">택배사</label>
            <select
              value={carrier}
              onChange={(e) => setCarrier(e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {['CJ대한통운', '롯데택배', '한진택배', '우체국택배', '로젠택배', '직배송'].map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-slate-500 block mb-1">운송장 번호</label>
            <input
              type="text"
              value={trackingNumber}
              onChange={(e) => setTrackingNumber(e.target.value)}
              placeholder="운송장 번호 입력"
              required
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 border border-slate-200 text-slate-600 px-4 py-2 rounded-lg text-sm hover:bg-slate-50 transition-colors"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              {submitting ? '등록 중…' : '등록'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── 주문 행 ───────────────────────────────────────────────────────────────────

function OrderRow({
  order,
  onStatusChange,
  onAddTracking,
}: {
  order: Order
  onStatusChange: (id: string, status: OrderStatus) => void
  onAddTracking: (id: string) => void
}) {
  const status = STATUS_STYLE[order.order_status] ?? STATUS_STYLE.new
  const canShip = ['confirmed', 'preparing'].includes(order.order_status)

  return (
    <tr className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
      <td className="py-3 px-4 text-xs font-mono text-slate-500">
        {order.market_order_id.slice(0, 16)}…
      </td>
      <td className="py-3 px-4 text-sm text-slate-700">
        {MARKETPLACE_LABELS[order.marketplace] ?? order.marketplace}
      </td>
      <td className="py-3 px-4 text-sm text-slate-700">{order.buyer_name ?? '—'}</td>
      <td className="py-3 px-4 text-sm text-right font-medium">{formatKRW(order.total_amount)}</td>
      <td className="py-3 px-4 text-xs text-slate-500">{formatDate(order.ordered_at)}</td>
      <td className="py-3 px-4">
        <span className={`inline-flex text-xs px-1.5 py-0.5 rounded border font-medium ${status.className}`}>
          {status.label}
        </span>
      </td>
      <td className="py-3 px-4">
        <div className="flex gap-1">
          {order.order_status === 'new' && (
            <button
              onClick={() => onStatusChange(order.id, 'confirmed')}
              className="text-xs bg-indigo-50 text-indigo-700 border border-indigo-200 px-2 py-0.5 rounded hover:bg-indigo-100 transition-colors"
            >
              확인
            </button>
          )}
          {order.order_status === 'confirmed' && (
            <button
              onClick={() => onStatusChange(order.id, 'preparing')}
              className="text-xs bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded hover:bg-amber-100 transition-colors"
            >
              준비
            </button>
          )}
          {canShip && (
            <button
              onClick={() => onAddTracking(order.id)}
              className="text-xs bg-sky-50 text-sky-700 border border-sky-200 px-2 py-0.5 rounded hover:bg-sky-100 transition-colors"
            >
              송장 등록
            </button>
          )}
        </div>
      </td>
    </tr>
  )
}

// ── 메인 페이지 ───────────────────────────────────────────────────────────────

export function OrdersPage() {
  const [filterMarket, setFilterMarket] = useState<Marketplace | ''>('')
  const [filterStatus, setFilterStatus] = useState<OrderStatus | ''>('')
  const [trackingOrderId, setTrackingOrderId] = useState<string | null>(null)
  const [collectingMarket, setCollectingMarket] = useState<Marketplace>('naver')
  const [collectMsg, setCollectMsg] = useState<string | null>(null)

  const { orders, total, loading, error, fetch } = useOrderList()
  const { stats, fetch: fetchStats } = useOrderStats()
  const { loading: actionLoading, updateStatus, addTracking, mockCollect } = useOrderActions()

  const reload = () => {
    fetch({ marketplace: filterMarket || undefined, status: filterStatus || undefined })
    fetchStats()
  }

  useEffect(() => {
    reload()
  }, [filterMarket, filterStatus])

  const handleStatusChange = async (orderId: string, status: OrderStatus) => {
    const ok = await updateStatus(orderId, status)
    if (ok) reload()
  }

  const handleAddTracking = async (carrier: string, trackingNumber: string) => {
    if (!trackingOrderId) return
    const ok = await addTracking(trackingOrderId, carrier, trackingNumber)
    if (ok) {
      setTrackingOrderId(null)
      reload()
    }
  }

  const handleMockCollect = async () => {
    setCollectMsg(null)
    const result = await mockCollect(collectingMarket, 3)
    if (result) {
      setCollectMsg(`${result.collected}건 수집, ${result.skipped}건 중복 스킵`)
      reload()
    } else {
      setCollectMsg('수집 실패')
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* 헤더 */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-800">주문 & 배송</h1>
          <p className="text-sm text-slate-500 mt-0.5">마켓 주문을 수집하고 배송을 관리합니다</p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={collectingMarket}
            onChange={(e) => setCollectingMarket(e.target.value as Marketplace)}
            className="border border-slate-200 rounded-lg px-2 py-2 text-sm bg-white focus:outline-none"
          >
            <option value="naver">네이버</option>
            <option value="coupang">쿠팡</option>
            <option value="store">자사몰</option>
          </select>
          <button
            onClick={handleMockCollect}
            disabled={actionLoading}
            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            {actionLoading ? '수집 중…' : '주문 수집 (Mock)'}
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6 space-y-6">
        {/* 수집 결과 */}
        {collectMsg && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 text-sm text-blue-700">
            {collectMsg}
          </div>
        )}

        {/* KPI 카드 */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            <KpiCard label="전체 주문" value={stats.total} />
            <KpiCard label="오늘 신규" value={stats.todayNew} />
            <KpiCard label="신규" value={stats.byStatus['new'] ?? 0} />
            <KpiCard label="배송중" value={stats.byStatus['shipping'] ?? 0} />
            <KpiCard label="배송완료" value={stats.byStatus['delivered'] ?? 0} />
            <KpiCard label="취소/반품" value={(stats.byStatus['cancelled'] ?? 0) + (stats.byStatus['returned'] ?? 0)} />
          </div>
        )}

        {/* 테이블 */}
        <div className="bg-white rounded-xl border border-slate-200">
          {/* 필터 */}
          <div className="flex items-center gap-3 p-4 border-b border-slate-200">
            <span className="text-sm font-medium text-slate-600">필터:</span>
            <select
              value={filterMarket}
              onChange={(e) => setFilterMarket(e.target.value as Marketplace | '')}
              className="border border-slate-200 rounded-lg px-2 py-1 text-sm bg-white focus:outline-none"
            >
              <option value="">전체 마켓</option>
              <option value="naver">네이버</option>
              <option value="coupang">쿠팡</option>
              <option value="store">자사몰</option>
            </select>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as OrderStatus | '')}
              className="border border-slate-200 rounded-lg px-2 py-1 text-sm bg-white focus:outline-none"
            >
              <option value="">전체 상태</option>
              {Object.entries(STATUS_STYLE).map(([k, v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </select>
            <span className="text-xs text-slate-400 ml-auto">{total}건</span>
          </div>

          <div className="overflow-x-auto">
            {loading ? (
              <div className="py-12 text-center text-slate-400 text-sm">불러오는 중…</div>
            ) : error ? (
              <div className="py-12 text-center text-red-400 text-sm">{error}</div>
            ) : orders.length === 0 ? (
              <div className="py-12 text-center">
                <p className="text-slate-400 text-sm">주문이 없습니다.</p>
                <p className="text-slate-300 text-xs mt-1">우측 상단 '주문 수집' 버튼으로 Mock 주문을 생성하세요.</p>
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    {['주문번호', '마켓', '구매자', '금액', '주문일시', '상태', '액션'].map((h) => (
                      <th key={h} className={`py-3 px-4 text-xs font-medium text-slate-500 text-left ${h === '금액' ? 'text-right' : ''}`}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order) => (
                    <OrderRow
                      key={order.id}
                      order={order}
                      onStatusChange={handleStatusChange}
                      onAddTracking={(id) => setTrackingOrderId(id)}
                    />
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* 송장 모달 */}
      {trackingOrderId && (
        <TrackingModal
          orderId={trackingOrderId}
          onClose={() => setTrackingOrderId(null)}
          onSubmit={handleAddTracking}
        />
      )}
    </div>
  )
}
