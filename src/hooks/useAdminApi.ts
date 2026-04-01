import { useState, useCallback, useContext } from 'react'
import { AdminAuthContext } from '../contexts/AdminAuthContext'

export interface AdminKpi {
  totalSellers: number
  activeSellers: number
  todayOrders: number
  todayRevenue: number
  activeProducts: number
  pendingJobs: number
}

export interface AdminSeller {
  id: string
  name: string
  email: string
  plan: string
  status: string
  created_at: string
}

export interface AdminJob {
  id: string
  queue: string
  name: string
  status: string
  attempts: number
  error: string | null
  created_at: string
  started_at: string | null
  completed_at: string | null
}

interface SellerFilters {
  search?: string
  status?: string
  plan?: string
}

interface JobFilters {
  status?: string
  queue?: string
}

function useAdminToken() {
  const { getAdminToken } = useContext(AdminAuthContext)
  return getAdminToken
}

function buildHeaders(token: string | null): HeadersInit {
  const headers: HeadersInit = { 'Content-Type': 'application/json' }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }
  return headers
}

export function useAdminKpi() {
  const [kpi, setKpi] = useState<AdminKpi | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const getToken = useAdminToken()

  const fetch = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await window.fetch('/api/v1/admin/kpi', {
        headers: buildHeaders(getToken()),
      })
      if (!res.ok) throw new Error(`KPI 조회 실패: ${res.status}`)
      const data = await res.json()
      setKpi(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : '알 수 없는 오류')
    } finally {
      setLoading(false)
    }
  }, [getToken])

  return { kpi, loading, error, fetch }
}

export function useAdminSellers() {
  const [sellers, setSellers] = useState<AdminSeller[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const getToken = useAdminToken()

  const fetch = useCallback(async (page: number, filters: SellerFilters = {}) => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({ page: String(page), limit: '20' })
      if (filters.search) params.set('search', filters.search)
      if (filters.status && filters.status !== 'all') params.set('status', filters.status)
      if (filters.plan && filters.plan !== 'all') params.set('plan', filters.plan)

      const res = await window.fetch(`/api/v1/admin/sellers?${params}`, {
        headers: buildHeaders(getToken()),
      })
      if (!res.ok) throw new Error(`셀러 목록 조회 실패: ${res.status}`)
      const data = await res.json()
      setSellers(data.sellers ?? [])
      setTotal(data.total ?? 0)
    } catch (e) {
      setError(e instanceof Error ? e.message : '알 수 없는 오류')
    } finally {
      setLoading(false)
    }
  }, [getToken])

  return { sellers, total, loading, error, fetch }
}

export function useUpdateSellerStatus() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const getToken = useAdminToken()

  const update = useCallback(async (sellerId: string, status: string) => {
    setLoading(true)
    setError(null)
    try {
      const res = await window.fetch(`/api/v1/admin/sellers/${sellerId}`, {
        method: 'PATCH',
        headers: buildHeaders(getToken()),
        body: JSON.stringify({ status }),
      })
      if (!res.ok) throw new Error(`셀러 상태 변경 실패: ${res.status}`)
      return true
    } catch (e) {
      setError(e instanceof Error ? e.message : '알 수 없는 오류')
      return false
    } finally {
      setLoading(false)
    }
  }, [getToken])

  return { update, loading, error }
}

export function useAdminJobs() {
  const [jobs, setJobs] = useState<AdminJob[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const getToken = useAdminToken()

  const fetch = useCallback(async (page: number, filters: JobFilters = {}) => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({ page: String(page), limit: '20' })
      if (filters.status && filters.status !== 'all') params.set('status', filters.status)
      if (filters.queue) params.set('queue', filters.queue)

      const res = await window.fetch(`/api/v1/admin/jobs?${params}`, {
        headers: buildHeaders(getToken()),
      })
      if (!res.ok) throw new Error(`잡 목록 조회 실패: ${res.status}`)
      const data = await res.json()
      setJobs(data.jobs ?? [])
      setTotal(data.total ?? 0)
    } catch (e) {
      setError(e instanceof Error ? e.message : '알 수 없는 오류')
    } finally {
      setLoading(false)
    }
  }, [getToken])

  return { jobs, total, loading, error, fetch }
}

export function useRetryJob() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const getToken = useAdminToken()

  const retry = useCallback(async (jobId: string) => {
    setLoading(true)
    setError(null)
    try {
      const res = await window.fetch(`/api/v1/admin/jobs/${jobId}/retry`, {
        method: 'POST',
        headers: buildHeaders(getToken()),
      })
      if (!res.ok) throw new Error(`잡 재시도 실패: ${res.status}`)
      return true
    } catch (e) {
      setError(e instanceof Error ? e.message : '알 수 없는 오류')
      return false
    } finally {
      setLoading(false)
    }
  }, [getToken])

  return { retry, loading, error }
}
