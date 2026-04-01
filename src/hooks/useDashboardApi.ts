import { useState, useCallback } from 'react'

const DEV_SELLER_ID = '00000000-0000-0000-0000-000000000001'

export interface DashboardKpi {
  todayOrders: number
  todayRevenue: number
  activeProducts: number
  stockoutRisk: number
}

export interface RecentOrder {
  id: string
  market_order_id: string
  marketplace: string
  buyer_name: string | null
  total_amount: number
  order_status: string
  ordered_at: string | null
}

export function useDashboardKpi() {
  const [kpi, setKpi] = useState<DashboardKpi | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetch = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await window.fetch(
        `/api/v1/dashboard/kpi?sellerId=${DEV_SELLER_ID}`
      )
      if (!res.ok) throw new Error(`KPI 조회 실패: ${res.status}`)
      const data = await res.json()
      setKpi(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : '알 수 없는 오류')
    } finally {
      setLoading(false)
    }
  }, [])

  return { kpi, loading, error, fetch }
}

export function useRecentOrders() {
  const [orders, setOrders] = useState<RecentOrder[]>([])
  const [loading, setLoading] = useState(false)

  const fetch = useCallback(async () => {
    setLoading(true)
    try {
      const res = await window.fetch(
        `/api/v1/orders?sellerId=${DEV_SELLER_ID}&limit=5&page=1`
      )
      if (!res.ok) return
      const data = await res.json()
      setOrders(data.orders ?? [])
    } catch {
      /* 무시 */
    } finally {
      setLoading(false)
    }
  }, [])

  return { orders, loading, fetch }
}
