import { useState, useEffect, useCallback } from 'react'
import { Card } from '../../components/ui/Card'
import { Search } from '../../components/icons'
import { useAdminSellers, useUpdateSellerStatus } from '../../hooks/useAdminApi'

const statusOptions = [
  { value: 'all', label: '전체' },
  { value: 'active', label: '활성' },
  { value: 'suspended', label: '정지' },
  { value: 'withdrawn', label: '탈퇴' },
]

const planOptions = [
  { value: 'all', label: '전체' },
  { value: 'starter', label: 'Starter' },
  { value: 'pro', label: 'Pro' },
  { value: 'business', label: 'Business' },
]

const statusBadge: Record<string, { bg: string; text: string; label: string }> = {
  active: { bg: 'bg-green-100', text: 'text-green-700', label: '활성' },
  suspended: { bg: 'bg-red-100', text: 'text-red-700', label: '정지' },
  withdrawn: { bg: 'bg-slate-100', text: 'text-slate-500', label: '탈퇴' },
}

const planBadge: Record<string, { bg: string; text: string }> = {
  starter: { bg: 'bg-slate-100', text: 'text-slate-700' },
  pro: { bg: 'bg-purple-100', text: 'text-purple-700' },
  business: { bg: 'bg-amber-100', text: 'text-amber-700' },
}

export function AdminSellers() {
  const [page, setPage] = useState(1)
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [planFilter, setPlanFilter] = useState('all')

  const { sellers, total, loading, error, fetch: fetchSellers } = useAdminSellers()
  const { update: updateStatus, loading: updating } = useUpdateSellerStatus()

  const loadSellers = useCallback(() => {
    fetchSellers(page, { search, status: statusFilter, plan: planFilter })
  }, [fetchSellers, page, search, statusFilter, planFilter])

  useEffect(() => {
    loadSellers()
  }, [loadSellers])

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    setSearch(searchInput)
    setPage(1)
  }

  async function handleToggleStatus(sellerId: string, currentStatus: string) {
    const newStatus = currentStatus === 'active' ? 'suspended' : 'active'
    const success = await updateStatus(sellerId, newStatus)
    if (success) {
      loadSellers()
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / 20))

  return (
    <div className="space-y-6">
      {/* 필터 영역 */}
      <Card>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end">
          {/* 검색 */}
          <form onSubmit={handleSearch} className="flex-1">
            <label className="mb-1 block text-sm font-medium text-slate-700">검색</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="이름 또는 이메일로 검색"
                className="w-full rounded-lg border border-slate-300 py-2.5 pl-10 pr-4 text-sm text-slate-900 placeholder:text-slate-400 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
              />
            </div>
          </form>

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

          {/* 플랜 필터 */}
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">플랜</label>
            <select
              value={planFilter}
              onChange={(e) => { setPlanFilter(e.target.value); setPage(1) }}
              className="rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
            >
              {planOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        </div>
      </Card>

      {/* 에러 표시 */}
      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* 셀러 테이블 */}
      <Card>
        <div className="overflow-x-auto">
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="animate-pulse flex gap-4">
                  <div className="h-4 w-24 rounded bg-slate-200" />
                  <div className="h-4 w-32 rounded bg-slate-200" />
                  <div className="h-4 w-16 rounded bg-slate-200" />
                  <div className="h-4 w-16 rounded bg-slate-200" />
                  <div className="h-4 w-24 rounded bg-slate-200" />
                  <div className="h-4 w-16 rounded bg-slate-200" />
                </div>
              ))}
            </div>
          ) : sellers.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-500">셀러가 없습니다</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left text-slate-500">
                  <th className="pb-2 pr-4 font-medium">이름</th>
                  <th className="pb-2 pr-4 font-medium">이메일</th>
                  <th className="pb-2 pr-4 font-medium">플랜</th>
                  <th className="pb-2 pr-4 font-medium">상태</th>
                  <th className="pb-2 pr-4 font-medium">가입일</th>
                  <th className="pb-2 font-medium">액션</th>
                </tr>
              </thead>
              <tbody>
                {sellers.map((seller) => {
                  const sBadge = statusBadge[seller.status] ?? statusBadge.active
                  const pBadge = planBadge[seller.plan] ?? planBadge.starter
                  return (
                    <tr key={seller.id} className="border-b border-slate-50 last:border-0">
                      <td className="py-2.5 pr-4 font-medium text-slate-900">{seller.name}</td>
                      <td className="py-2.5 pr-4 text-slate-600">{seller.email}</td>
                      <td className="py-2.5 pr-4">
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium capitalize ${pBadge.bg} ${pBadge.text}`}>
                          {seller.plan}
                        </span>
                      </td>
                      <td className="py-2.5 pr-4">
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${sBadge.bg} ${sBadge.text}`}>
                          {sBadge.label}
                        </span>
                      </td>
                      <td className="py-2.5 pr-4 text-slate-600">{seller.created_at}</td>
                      <td className="py-2.5">
                        {seller.status !== 'withdrawn' && (
                          <button
                            onClick={() => handleToggleStatus(seller.id, seller.status)}
                            disabled={updating}
                            className={`rounded-lg px-3 py-1 text-xs font-medium transition-colors disabled:opacity-50 ${
                              seller.status === 'active'
                                ? 'bg-red-50 text-red-600 hover:bg-red-100'
                                : 'bg-green-50 text-green-600 hover:bg-green-100'
                            }`}
                          >
                            {seller.status === 'active' ? '정지' : '활성화'}
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
              총 {total}명 중 {(page - 1) * 20 + 1}-{Math.min(page * 20, total)}
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
