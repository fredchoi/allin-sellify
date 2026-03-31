import { useState, useCallback } from 'react'

const API_BASE = '/api/v1/content'

// ── 타입 ─────────────────────────────────────────────────────────────────────

export type PostStatus = 'draft' | 'generating' | 'ready' | 'publishing' | 'published' | 'failed'
export type PublishStatus = 'pending' | 'published' | 'failed' | 'deleted'
export type Channel = 'blog' | 'instagram' | 'facebook' | 'threads' | 'x'

export interface ChannelPost {
  id: string
  content_post_id: string
  channel: Channel
  channel_title: string | null
  channel_body: string
  hashtags: string[]
  publish_status: PublishStatus
  channel_post_id: string | null
  channel_url: string | null
  published_at: string | null
  error_detail: string | null
  created_at: string
  updated_at: string
}

export interface ContentPost {
  id: string
  seller_id: string
  processed_product_id: string | null
  master_title: string
  master_body: string
  master_images: string[]
  keywords: string[]
  post_status: PostStatus
  scheduled_at: string | null
  created_at: string
  updated_at: string
  channelPosts?: ChannelPost[]
}

export interface CreateContentInput {
  sellerId: string
  masterTitle: string
  masterBody: string
  keywords: string[]
  processedProductId?: string
  scheduledAt?: string
}

// ── 목록 조회 ─────────────────────────────────────────────────────────────────

export function useContentPosts(params?: {
  sellerId?: string
  postStatus?: PostStatus
  page?: number
  pageSize?: number
}) {
  const [posts, setPosts] = useState<ContentPost[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetch = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const qs = new URLSearchParams()
      if (params?.sellerId) qs.set('sellerId', params.sellerId)
      if (params?.postStatus) qs.set('postStatus', params.postStatus)
      if (params?.page) qs.set('page', String(params.page))
      if (params?.pageSize) qs.set('pageSize', String(params.pageSize))

      const res = await window.fetch(`${API_BASE}?${qs.toString()}`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json() as { data: ContentPost[]; total: number }
      setPosts(data.data)
      setTotal(data.total)
    } catch (e) {
      setError(e instanceof Error ? e.message : '조회 실패')
    } finally {
      setLoading(false)
    }
  }, [params?.sellerId, params?.postStatus, params?.page, params?.pageSize])

  return { posts, total, loading, error, refetch: fetch }
}

// ── 상세 조회 ─────────────────────────────────────────────────────────────────

export function useContentPostDetail() {
  const [post, setPost] = useState<ContentPost | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchDetail = useCallback(async (id: string) => {
    setLoading(true)
    setError(null)
    try {
      const res = await window.fetch(`${API_BASE}/${id}`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json() as ContentPost
      setPost(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : '상세 조회 실패')
    } finally {
      setLoading(false)
    }
  }, [])

  return { post, loading, error, fetchDetail }
}

// ── 콘텐츠 생성 ───────────────────────────────────────────────────────────────

export function useCreateContent() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const create = useCallback(async (input: CreateContentInput): Promise<string | null> => {
    setLoading(true)
    setError(null)
    try {
      const res = await window.fetch(API_BASE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sellerId: input.sellerId,
          masterTitle: input.masterTitle,
          masterBody: input.masterBody,
          keywords: input.keywords,
          masterImages: [],
          ...(input.processedProductId ? { processedProductId: input.processedProductId } : {}),
          ...(input.scheduledAt ? { scheduledAt: input.scheduledAt } : {}),
        }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { message?: string }
        throw new Error(body.message ?? `HTTP ${res.status}`)
      }
      const data = await res.json() as { id: string }
      return data.id
    } catch (e) {
      setError(e instanceof Error ? e.message : '생성 실패')
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  return { create, loading, error }
}

// ── 채널 발행 ─────────────────────────────────────────────────────────────────

export function usePublishContent() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const publish = useCallback(async (
    postId: string,
    channels: Channel[]
  ): Promise<{ published: number; failed: number } | null> => {
    setLoading(true)
    setError(null)
    try {
      const res = await window.fetch(`${API_BASE}/${postId}/publish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channels }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { message?: string }
        throw new Error(body.message ?? `HTTP ${res.status}`)
      }
      return await res.json() as { published: number; failed: number }
    } catch (e) {
      setError(e instanceof Error ? e.message : '발행 실패')
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  return { publish, loading, error }
}
