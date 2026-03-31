import { useState, useCallback } from 'react'

const DEV_SELLER_ID = '00000000-0000-0000-0000-000000000001'

export type Tier = 'tier1' | 'tier2' | 'tier3'
export type SyncStatus = 'active' | 'paused' | 'error'

export interface InventorySyncJob {
  id: string
  wholesale_product_id: string
  tier: Tier
  last_polled_at: string | null
  next_poll_at: string | null
  poll_count: number
  last_error: string | null
  status: SyncStatus
  created_at: string
  updated_at: string
  product_name?: string
  stock_quantity?: number
  supply_status?: string
}

export interface InventorySnapshot {
  id: string
  wholesale_product_id: string
  quantity: number
  price: number | null
  supply_status: string | null
  recorded_at: string
}

export interface QueueStatus {
  waiting: number
  active: number
  completed: number
  failed: number
}

export function useInventoryList() {
  const [jobs, setJobs] = useState<InventorySyncJob[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetch = useCallback(async (params: {
    tier?: Tier
    status?: SyncStatus
    page?: number
    limit?: number
  } = {}) => {
    setLoading(true)
    setError(null)
    try {
      const qs = new URLSearchParams({
        sellerId: DEV_SELLER_ID,
        page: String(params.page ?? 1),
        limit: String(params.limit ?? 50),
      })
      if (params.tier) qs.set('tier', params.tier)
      if (params.status) qs.set('status', params.status)

      const res = await window.fetch(`/api/v1/inventory?${qs}`)
      if (!res.ok) throw new Error(`재고 조회 실패: ${res.status}`)
      const data = await res.json()
      setJobs(data.jobs ?? [])
      setTotal(data.total ?? 0)
    } catch (e) {
      setError(e instanceof Error ? e.message : '알 수 없는 오류')
    } finally {
      setLoading(false)
    }
  }, [])

  return { jobs, total, loading, error, fetch }
}

export function useInventoryHistory(jobId: string | null) {
  const [history, setHistory] = useState<InventorySnapshot[]>([])
  const [loading, setLoading] = useState(false)

  const fetch = useCallback(async () => {
    if (!jobId) return
    setLoading(true)
    try {
      const res = await window.fetch(`/api/v1/inventory/${jobId}/history?limit=30`)
      if (!res.ok) throw new Error()
      setHistory(await res.json())
    } catch {
      setHistory([])
    } finally {
      setLoading(false)
    }
  }, [jobId])

  return { history, loading, fetch }
}

export function useInventorySync() {
  const [status, setStatus] = useState<QueueStatus | null>(null)
  const [triggering, setTriggering] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  const fetchStatus = useCallback(async () => {
    try {
      const res = await window.fetch('/api/v1/inventory/sync/status')
      if (res.ok) setStatus(await res.json())
    } catch { /* 무시 */ }
  }, [])

  const trigger = useCallback(async () => {
    setTriggering(true)
    setMessage(null)
    try {
      const res = await window.fetch('/api/v1/inventory/sync/trigger', { method: 'POST' })
      if (!res.ok) throw new Error()
      const data = await res.json()
      setMessage(data.message)
      await fetchStatus()
    } catch {
      setMessage('동기화 트리거 실패')
    } finally {
      setTriggering(false)
    }
  }, [fetchStatus])

  const updateTier = useCallback(async (jobId: string, tier: Tier): Promise<boolean> => {
    try {
      const res = await window.fetch(`/api/v1/inventory/${jobId}/tier`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tier }),
      })
      return res.ok
    } catch {
      return false
    }
  }, [])

  return { status, triggering, message, fetchStatus, trigger, updateTier }
}
