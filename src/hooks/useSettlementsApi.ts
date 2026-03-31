import { useState, useCallback } from 'react'

const DEV_SELLER_ID = '00000000-0000-0000-0000-000000000001'

export type Marketplace = 'naver' | 'coupang' | 'store'
export type SettlementStatus = 'pending' | 'confirmed' | 'paid' | 'disputed'

export interface Settlement {
  id: string
  seller_id: string
  marketplace: Marketplace
  period_start: string
  period_end: string
  total_sales: number
  total_commission: number
  total_wholesale: number
  net_profit: number
  settlement_status: SettlementStatus
  settled_at: string | null
  details: { itemCount?: number } & Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface MarketFeeRule {
  id: string
  marketplace: Marketplace
  category: string | null
  fee_rate: string
  fee_type: 'percentage' | 'fixed'
  effective_from: string
  effective_to: string | null
  created_at: string
}

export interface SettlementSummary {
  totalSales: number
  totalCommission: number
  totalWholesale: number
  netProfit: number
  marginRate: number
  itemCount: number
}

export function useListSettlements() {
  const [settlements, setSettlements] = useState<Settlement[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetch = useCallback(async (params: {
    marketplace?: Marketplace
    status?: SettlementStatus
    from?: string
    to?: string
    page?: number
    limit?: number
  } = {}) => {
    setLoading(true)
    setError(null)
    try {
      const qs = new URLSearchParams({
        sellerId: DEV_SELLER_ID,
        page: String(params.page ?? 1),
        limit: String(params.limit ?? 20),
      })
      if (params.marketplace) qs.set('marketplace', params.marketplace)
      if (params.status) qs.set('status', params.status)
      if (params.from) qs.set('from', params.from)
      if (params.to) qs.set('to', params.to)

      const res = await window.fetch(`/api/v1/settlements?${qs}`)
      if (!res.ok) throw new Error(`정산 목록 조회 실패: ${res.status}`)
      const data = await res.json()
      setSettlements(data.settlements ?? [])
      setTotal(data.total ?? 0)
    } catch (e) {
      setError(e instanceof Error ? e.message : '알 수 없는 오류')
    } finally {
      setLoading(false)
    }
  }, [])

  return { settlements, total, loading, error, fetch }
}

export function useCalculateSettlement() {
  const [result, setResult] = useState<Settlement | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const calculate = useCallback(async (params: {
    marketplace: Marketplace
    periodStart: string
    periodEnd: string
  }) => {
    setLoading(true)
    setError(null)
    try {
      const res = await window.fetch('/api/v1/settlements/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sellerId: DEV_SELLER_ID,
          marketplace: params.marketplace,
          periodStart: params.periodStart,
          periodEnd: params.periodEnd,
        }),
      })
      if (!res.ok) throw new Error(`정산 계산 실패: ${res.status}`)
      const data = await res.json()
      setResult(data)
      return data as Settlement
    } catch (e) {
      setError(e instanceof Error ? e.message : '알 수 없는 오류')
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  return { result, loading, error, calculate }
}

export function useFeeRules() {
  const [feeRules, setFeeRules] = useState<MarketFeeRule[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchRules = useCallback(async (marketplace?: Marketplace) => {
    setLoading(true)
    setError(null)
    try {
      const qs = new URLSearchParams()
      if (marketplace) qs.set('marketplace', marketplace)
      const res = await window.fetch(`/api/v1/settlements/fee-rules?${qs}`)
      if (!res.ok) throw new Error(`수수료 규칙 조회 실패: ${res.status}`)
      const data = await res.json()
      setFeeRules(data ?? [])
    } catch (e) {
      setError(e instanceof Error ? e.message : '알 수 없는 오류')
    } finally {
      setLoading(false)
    }
  }, [])

  const addRule = useCallback(async (data: {
    marketplace: Marketplace
    category?: string
    feeRate: number
    feeType: 'percentage' | 'fixed'
    effectiveFrom: string
    effectiveTo?: string
  }) => {
    const res = await window.fetch('/api/v1/settlements/fee-rules', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (!res.ok) throw new Error(`수수료 규칙 등록 실패: ${res.status}`)
    return await res.json() as MarketFeeRule
  }, [])

  return { feeRules, loading, error, fetchRules, addRule }
}

export function buildSummary(settlements: Settlement[]): SettlementSummary {
  const totalSales = settlements.reduce((s, r) => s + r.total_sales, 0)
  const totalCommission = settlements.reduce((s, r) => s + r.total_commission, 0)
  const totalWholesale = settlements.reduce((s, r) => s + r.total_wholesale, 0)
  const netProfit = settlements.reduce((s, r) => s + r.net_profit, 0)
  const itemCount = settlements.reduce((s, r) => s + (r.details.itemCount ?? 0), 0)
  const marginRate = totalSales > 0 ? (netProfit / totalSales) * 100 : 0

  return { totalSales, totalCommission, totalWholesale, netProfit, marginRate, itemCount }
}
