import { useState, useCallback } from 'react'

const DEV_SELLER_ID = '00000000-0000-0000-0000-000000000001'

export type OrderStatus =
  | 'new' | 'confirmed' | 'preparing' | 'shipping'
  | 'delivered' | 'cancelled' | 'returned' | 'exchanged'
export type Marketplace = 'naver' | 'coupang' | 'store'

export interface OrderItem {
  id: string
  order_id: string
  product_name: string
  option_name: string | null
  quantity: number
  selling_price: number
  wholesale_price: number
  commission_rate: string | null
  wholesale_order_status: string
}

export interface Order {
  id: string
  seller_id: string
  marketplace: Marketplace
  market_order_id: string
  order_status: OrderStatus
  buyer_name: string | null
  buyer_phone: string | null
  buyer_address: string | null
  total_amount: number
  commission_amount: number
  ordered_at: string | null
  created_at: string
  updated_at: string
  items?: OrderItem[]
}

export interface OrderStats {
  total: number
  byStatus: Record<string, number>
  byMarketplace: Record<string, number>
  todayNew: number
}

export function useOrderList() {
  const [orders, setOrders] = useState<Order[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetch = useCallback(async (params: {
    marketplace?: Marketplace
    status?: OrderStatus
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

      const res = await window.fetch(`/api/v1/orders?${qs}`)
      if (!res.ok) throw new Error(`주문 조회 실패: ${res.status}`)
      const data = await res.json()
      setOrders(data.orders ?? [])
      setTotal(data.total ?? 0)
    } catch (e) {
      setError(e instanceof Error ? e.message : '알 수 없는 오류')
    } finally {
      setLoading(false)
    }
  }, [])

  return { orders, total, loading, error, fetch }
}

export function useOrderStats() {
  const [stats, setStats] = useState<OrderStats | null>(null)
  const [loading, setLoading] = useState(false)

  const fetch = useCallback(async () => {
    setLoading(true)
    try {
      const res = await window.fetch(`/api/v1/orders/stats?sellerId=${DEV_SELLER_ID}`)
      if (res.ok) setStats(await res.json())
    } catch { /* 무시 */ } finally {
      setLoading(false)
    }
  }, [])

  return { stats, loading, fetch }
}

export function useOrderActions() {
  const [loading, setLoading] = useState(false)

  const updateStatus = useCallback(async (orderId: string, status: OrderStatus): Promise<boolean> => {
    setLoading(true)
    try {
      const res = await window.fetch(`/api/v1/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      return res.ok
    } catch {
      return false
    } finally {
      setLoading(false)
    }
  }, [])

  const addTracking = useCallback(async (
    orderId: string,
    carrier: string,
    trackingNumber: string
  ): Promise<boolean> => {
    setLoading(true)
    try {
      const res = await window.fetch(`/api/v1/orders/${orderId}/tracking`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ carrier, trackingNumber }),
      })
      return res.ok
    } catch {
      return false
    } finally {
      setLoading(false)
    }
  }, [])

  const mockCollect = useCallback(async (marketplace: Marketplace, count = 3): Promise<{
    collected: number
    skipped: number
  } | null> => {
    setLoading(true)
    try {
      const res = await window.fetch('/api/v1/orders/mock-collect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sellerId: DEV_SELLER_ID, marketplace, count }),
      })
      if (!res.ok) return null
      return await res.json()
    } catch {
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  return { loading, updateStatus, addTracking, mockCollect }
}
