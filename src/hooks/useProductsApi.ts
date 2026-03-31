import { useState, useCallback } from 'react'

const DEV_SELLER_ID = '00000000-0000-0000-0000-000000000001'

export interface WholesaleProduct {
  id: string
  source: string
  name: string
  price: number
  category: string | null
  images: string[]
  options: Array<{ name: string; values: string[] }>
  supply_status: string
  stock_quantity: number | null
  last_synced_at: string | null
  created_at: string
}

export interface ProcessedProduct {
  id: string
  seller_id: string
  wholesale_product_id: string
  title: string | null
  hooking_text: string | null
  description: string | null
  processed_images: Array<{ filename: string; path: string; width: number; height: number; format: string }>
  processed_options: Array<{ name: string; values: string[] }>
  selling_price: number | null
  margin_rate: string | null
  processing_status: string
  processing_checkpoints: Record<string, unknown>
  created_at: string
  updated_at: string
  // joined
  wholesale_name?: string
  wholesale_price?: number
  wholesale_images?: string[]
  wholesale_source?: string
  wholesale_options?: Array<{ name: string; values: string[] }>
  listings?: MarketListing[]
}

export interface MarketListing {
  id: string
  marketplace: string
  market_product_id: string | null
  listing_price: number
  listing_status: string
  created_at: string
}

export interface CollectResult {
  ok: boolean
  collected: number
  skipped: number
  duplicates: number
}

// ── 도매 상품 수집 ─────────────────────────────────────────────────────────

export function useCollectProducts() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const collect = useCallback(
    async (opts: {
      source?: 'domeggook' | 'mock'
      keyword?: string
      category?: string
      page?: number
      pageSize?: number
    }): Promise<CollectResult> => {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch('/api/v1/products/collect', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...opts,
            source: opts.source ?? 'mock',
            sellerId: DEV_SELLER_ID,
          }),
        })
        if (!res.ok) {
          const err = await res.json().catch(() => ({}))
          throw new Error(err.message ?? `수집 실패 (${res.status})`)
        }
        return await res.json()
      } catch (e) {
        const msg = e instanceof Error ? e.message : '알 수 없는 오류'
        setError(msg)
        throw e
      } finally {
        setLoading(false)
      }
    },
    []
  )

  return { collect, loading, error }
}

// ── 도매 상품 목록 ─────────────────────────────────────────────────────────

export function useWholesaleProducts() {
  const [products, setProducts] = useState<WholesaleProduct[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(
    async (opts: { page?: number; pageSize?: number; supplyStatus?: string } = {}) => {
      setLoading(true)
      setError(null)
      try {
        const params = new URLSearchParams({
          page: String(opts.page ?? 1),
          pageSize: String(opts.pageSize ?? 20),
        })
        if (opts.supplyStatus) params.set('supplyStatus', opts.supplyStatus)

        const res = await fetch(`/api/v1/products/wholesale?${params}`)
        if (!res.ok) throw new Error(`조회 실패 (${res.status})`)
        const data = await res.json()
        setProducts(data.products ?? [])
        setTotal(data.total ?? 0)
      } catch (e) {
        const msg = e instanceof Error ? e.message : '알 수 없는 오류'
        setError(msg)
      } finally {
        setLoading(false)
      }
    },
    []
  )

  return { products, total, loading, error, load }
}

// ── AI 가공 ────────────────────────────────────────────────────────────────

export function useProcessProduct() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const process = useCallback(
    async (wholesaleProductId: string, sellingPrice?: number): Promise<string> => {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch('/api/v1/products/process', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            wholesaleProductId,
            sellerId: DEV_SELLER_ID,
            sellingPrice,
          }),
        })
        if (!res.ok) {
          const err = await res.json().catch(() => ({}))
          throw new Error(err.message ?? `가공 요청 실패 (${res.status})`)
        }
        const data = await res.json()
        return data.processedProductId as string
      } catch (e) {
        const msg = e instanceof Error ? e.message : '알 수 없는 오류'
        setError(msg)
        throw e
      } finally {
        setLoading(false)
      }
    },
    []
  )

  return { process, loading, error }
}

// ── 가공 상품 목록 ─────────────────────────────────────────────────────────

export function useProcessedProducts() {
  const [products, setProducts] = useState<ProcessedProduct[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(
    async (opts: { page?: number; pageSize?: number; processingStatus?: string } = {}) => {
      setLoading(true)
      setError(null)
      try {
        const params = new URLSearchParams({
          sellerId: DEV_SELLER_ID,
          page: String(opts.page ?? 1),
          pageSize: String(opts.pageSize ?? 20),
        })
        if (opts.processingStatus) params.set('processingStatus', opts.processingStatus)

        const res = await fetch(`/api/v1/products/processed?${params}`)
        if (!res.ok) throw new Error(`조회 실패 (${res.status})`)
        const data = await res.json()
        setProducts(data.products ?? [])
        setTotal(data.total ?? 0)
      } catch (e) {
        const msg = e instanceof Error ? e.message : '알 수 없는 오류'
        setError(msg)
      } finally {
        setLoading(false)
      }
    },
    []
  )

  return { products, total, loading, error, load }
}

// ── 가공 상품 상세 ─────────────────────────────────────────────────────────

export function useProcessedProductDetail() {
  const [product, setProduct] = useState<ProcessedProduct | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async (id: string) => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/v1/products/processed/${id}`)
      if (!res.ok) throw new Error('상세 조회 실패')
      setProduct(await res.json())
    } catch (e) {
      setError(e instanceof Error ? e.message : '알 수 없는 오류')
    } finally {
      setLoading(false)
    }
  }, [])

  const update = useCallback(
    async (
      id: string,
      data: { title?: string; hookingText?: string; sellingPrice?: number }
    ) => {
      const res = await fetch(`/api/v1/products/processed/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) throw new Error('수정 실패')
      await load(id)
    },
    [load]
  )

  return { product, loading, error, load, update }
}
