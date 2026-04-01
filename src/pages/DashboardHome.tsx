import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { ShoppingCart, TrendingUp, Package, AlertTriangle } from '../components/icons'
import { useDashboardKpi, useRecentOrders } from '../hooks/useDashboardApi'

const statusLabels: Record<string, string> = {
  new: '신규',
  confirmed: '확인',
  preparing: '준비중',
  shipping: '배송중',
  delivered: '배송완료',
  cancelled: '취소',
  returned: '반품',
  exchanged: '교환',
}

const marketplaceLabels: Record<string, string> = {
  naver: '네이버',
  coupang: '쿠팡',
  store: '자사몰',
}

function formatRevenue(amount: number): string {
  if (amount >= 10000) {
    const man = Math.floor(amount / 10000)
    const remainder = amount % 10000
    return remainder > 0 ? `${man}만 ${remainder.toLocaleString()}원` : `${man}만원`
  }
  return `${amount.toLocaleString()}원`
}

export function DashboardHome() {
  const { kpi, loading: kpiLoading, error: kpiError, fetch: fetchKpi } = useDashboardKpi()
  const { orders, loading: ordersLoading, fetch: fetchOrders } = useRecentOrders()

  useEffect(() => {
    fetchKpi()
    fetchOrders()
  }, [fetchKpi, fetchOrders])

  const kpiCards = [
    {
      label: '오늘 주문',
      value: kpi?.todayOrders ?? 0,
      format: (v: number) => `${v}건`,
      icon: ShoppingCart,
      iconBg: 'bg-blue-100',
      iconColor: 'text-blue-600',
    },
    {
      label: '오늘 매출',
      value: kpi?.todayRevenue ?? 0,
      format: formatRevenue,
      icon: TrendingUp,
      iconBg: 'bg-green-100',
      iconColor: 'text-green-600',
    },
    {
      label: '활성 상품',
      value: kpi?.activeProducts ?? 0,
      format: (v: number) => `${v}개`,
      icon: Package,
      iconBg: 'bg-purple-100',
      iconColor: 'text-purple-600',
    },
    {
      label: '품절 위험',
      value: kpi?.stockoutRisk ?? 0,
      format: (v: number) => `${v}개`,
      icon: AlertTriangle,
      iconBg: 'bg-red-100',
      iconColor: 'text-red-600',
      warning: true,
    },
  ]

  return (
    <div className="space-y-6">
      {/* KPI 카드 */}
      {kpiError && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {kpiError}
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {kpiCards.map(({ label, value, format, icon: Icon, iconBg, iconColor, warning }) => (
          <Card key={label} className="relative">
            {kpiLoading ? (
              <div className="animate-pulse space-y-3">
                <div className="h-10 w-10 rounded-lg bg-slate-200" />
                <div className="h-4 w-16 rounded bg-slate-200" />
                <div className="h-7 w-20 rounded bg-slate-200" />
              </div>
            ) : (
              <>
                <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${iconBg}`}>
                  <Icon className={`h-5 w-5 ${iconColor}`} />
                </div>
                <p className="mt-3 text-sm text-slate-500">{label}</p>
                <p className="mt-1 text-2xl font-bold text-slate-900">{format(value)}</p>
                {warning && value > 0 && (
                  <span className="absolute right-4 top-4 flex h-2.5 w-2.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
                    <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-500" />
                  </span>
                )}
              </>
            )}
          </Card>
        ))}
      </div>

      {/* 빠른 액션 */}
      <Card>
        <h2 className="text-base font-semibold text-slate-900">빠른 작업</h2>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link to="/dashboard/products">
            <Button size="sm">상품 등록하기</Button>
          </Link>
          <Link to="/dashboard/orders">
            <Button variant="secondary" size="sm">주문 확인</Button>
          </Link>
          <Link to="/dashboard/inventory">
            <Button variant="secondary" size="sm">재고 체크</Button>
          </Link>
        </div>
      </Card>

      {/* 최근 주문 */}
      <Card>
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-900">최근 주문</h2>
          <Link
            to="/dashboard/orders"
            className="text-sm font-medium text-blue-600 hover:text-blue-700"
          >
            전체 보기
          </Link>
        </div>

        <div className="mt-4 overflow-x-auto">
          {ordersLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="animate-pulse flex gap-4">
                  <div className="h-4 w-24 rounded bg-slate-200" />
                  <div className="h-4 w-16 rounded bg-slate-200" />
                  <div className="h-4 w-20 rounded bg-slate-200" />
                  <div className="h-4 w-16 rounded bg-slate-200" />
                </div>
              ))}
            </div>
          ) : orders.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-500">아직 주문이 없습니다</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left text-slate-500">
                  <th className="pb-2 pr-4 font-medium">주문번호</th>
                  <th className="pb-2 pr-4 font-medium">마켓</th>
                  <th className="pb-2 pr-4 font-medium">구매자</th>
                  <th className="pb-2 pr-4 font-medium text-right">금액</th>
                  <th className="pb-2 font-medium">상태</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order.id} className="border-b border-slate-50 last:border-0">
                    <td className="py-2.5 pr-4 font-mono text-xs text-slate-600">
                      {order.market_order_id.slice(0, 12)}
                    </td>
                    <td className="py-2.5 pr-4 text-slate-700">
                      {marketplaceLabels[order.marketplace] ?? order.marketplace}
                    </td>
                    <td className="py-2.5 pr-4 text-slate-700">
                      {order.buyer_name ?? '-'}
                    </td>
                    <td className="py-2.5 pr-4 text-right font-medium text-slate-900">
                      {order.total_amount.toLocaleString()}원
                    </td>
                    <td className="py-2.5">
                      <span className="inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
                        {statusLabels[order.order_status] ?? order.order_status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </Card>
    </div>
  )
}
