import { useEffect } from 'react'
import { Card } from '../../components/ui/Card'
import { ShoppingCart, TrendingUp, Package } from '../../components/icons'
import { useAdminKpi, type AdminKpi } from '../../hooks/useAdminApi'

function UsersIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 00-3-3.87" />
      <path d="M16 3.13a4 4 0 010 7.75" />
    </svg>
  )
}

function ActivityIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
    </svg>
  )
}

function UserCheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
      <circle cx="8.5" cy="7" r="4" />
      <polyline points="17 11 19 13 23 9" />
    </svg>
  )
}

function formatRevenue(amount: number): string {
  if (amount >= 10000) {
    const man = Math.floor(amount / 10000)
    const remainder = amount % 10000
    return remainder > 0 ? `${man}만 ${remainder.toLocaleString()}원` : `${man}만원`
  }
  return `${amount.toLocaleString()}원`
}

interface KpiCardDef {
  label: string
  key: keyof AdminKpi
  format: (v: number) => string
  icon: React.ComponentType<{ className?: string }>
  iconBg: string
  iconColor: string
}

const kpiCardDefs: KpiCardDef[] = [
  {
    label: '전체 셀러',
    key: 'totalSellers',
    format: (v) => `${v}명`,
    icon: UsersIcon,
    iconBg: 'bg-purple-100',
    iconColor: 'text-purple-600',
  },
  {
    label: '활성 셀러',
    key: 'activeSellers',
    format: (v) => `${v}명`,
    icon: UserCheckIcon,
    iconBg: 'bg-green-100',
    iconColor: 'text-green-600',
  },
  {
    label: '오늘 주문',
    key: 'todayOrders',
    format: (v) => `${v}건`,
    icon: ShoppingCart,
    iconBg: 'bg-blue-100',
    iconColor: 'text-blue-600',
  },
  {
    label: '오늘 매출',
    key: 'todayRevenue',
    format: formatRevenue,
    icon: TrendingUp,
    iconBg: 'bg-emerald-100',
    iconColor: 'text-emerald-600',
  },
  {
    label: '활성 상품',
    key: 'activeProducts',
    format: (v) => `${v}개`,
    icon: Package,
    iconBg: 'bg-amber-100',
    iconColor: 'text-amber-600',
  },
  {
    label: '잡 큐 대기',
    key: 'pendingJobs',
    format: (v) => `${v}건`,
    icon: ActivityIcon,
    iconBg: 'bg-red-100',
    iconColor: 'text-red-600',
  },
]

// Mock data for plan distribution and recent signups
const MOCK_PLAN_DIST = { starter: 42, pro: 28, business: 12 }
const MOCK_RECENT_SIGNUPS = [
  { id: '1', name: '김셀러', email: 'kim@example.com', plan: 'starter', created_at: '2026-03-30' },
  { id: '2', name: '이판매', email: 'lee@shop.kr', plan: 'pro', created_at: '2026-03-29' },
  { id: '3', name: '박마켓', email: 'park@biz.com', plan: 'business', created_at: '2026-03-28' },
  { id: '4', name: '최커머스', email: 'choi@sell.kr', plan: 'starter', created_at: '2026-03-27' },
  { id: '5', name: '정스토어', email: 'jung@store.co', plan: 'pro', created_at: '2026-03-26' },
]

const planColors: Record<string, { bg: string; text: string; bar: string }> = {
  starter: { bg: 'bg-slate-100', text: 'text-slate-700', bar: 'bg-slate-400' },
  pro: { bg: 'bg-purple-100', text: 'text-purple-700', bar: 'bg-purple-500' },
  business: { bg: 'bg-amber-100', text: 'text-amber-700', bar: 'bg-amber-500' },
}

export function AdminDashboard() {
  const { kpi, loading, error, fetch: fetchKpi } = useAdminKpi()

  useEffect(() => {
    fetchKpi()
  }, [fetchKpi])

  const totalPlan = MOCK_PLAN_DIST.starter + MOCK_PLAN_DIST.pro + MOCK_PLAN_DIST.business

  return (
    <div className="space-y-6">
      {/* 에러 표시 */}
      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* KPI 카드 */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        {kpiCardDefs.map(({ label, key, format, icon: Icon, iconBg, iconColor }) => (
          <Card key={key}>
            {loading ? (
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
                <p className="mt-1 text-2xl font-bold text-slate-900">
                  {format(kpi?.[key] ?? 0)}
                </p>
              </>
            )}
          </Card>
        ))}
      </div>

      {/* 플랜 분포 */}
      <Card>
        <h2 className="text-base font-semibold text-slate-900">플랜 분포</h2>
        <div className="mt-4">
          <div className="flex h-4 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className="bg-slate-400 transition-all"
              style={{ width: `${(MOCK_PLAN_DIST.starter / totalPlan) * 100}%` }}
            />
            <div
              className="bg-purple-500 transition-all"
              style={{ width: `${(MOCK_PLAN_DIST.pro / totalPlan) * 100}%` }}
            />
            <div
              className="bg-amber-500 transition-all"
              style={{ width: `${(MOCK_PLAN_DIST.business / totalPlan) * 100}%` }}
            />
          </div>
          <div className="mt-3 flex gap-6">
            {Object.entries(MOCK_PLAN_DIST).map(([plan, count]) => {
              const colors = planColors[plan]
              return (
                <div key={plan} className="flex items-center gap-2">
                  <span className={`inline-block h-3 w-3 rounded-full ${colors.bar}`} />
                  <span className="text-sm text-slate-600 capitalize">{plan}</span>
                  <span className="text-sm font-semibold text-slate-900">{count}</span>
                </div>
              )
            })}
          </div>
        </div>
      </Card>

      {/* 최근 가입 셀러 */}
      <Card>
        <h2 className="text-base font-semibold text-slate-900">최근 가입 셀러</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-left text-slate-500">
                <th className="pb-2 pr-4 font-medium">이름</th>
                <th className="pb-2 pr-4 font-medium">이메일</th>
                <th className="pb-2 pr-4 font-medium">플랜</th>
                <th className="pb-2 font-medium">가입일</th>
              </tr>
            </thead>
            <tbody>
              {MOCK_RECENT_SIGNUPS.map((seller) => {
                const colors = planColors[seller.plan] ?? planColors.starter
                return (
                  <tr key={seller.id} className="border-b border-slate-50 last:border-0">
                    <td className="py-2.5 pr-4 font-medium text-slate-900">{seller.name}</td>
                    <td className="py-2.5 pr-4 text-slate-600">{seller.email}</td>
                    <td className="py-2.5 pr-4">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium capitalize ${colors.bg} ${colors.text}`}>
                        {seller.plan}
                      </span>
                    </td>
                    <td className="py-2.5 text-slate-600">{seller.created_at}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
