import { z } from 'zod'

// ── 콘텐츠 생성 요청 ─────────────────────────────────────────────────────────

export const CreateContentPostSchema = z.object({
  sellerId: z.string().uuid(),
  processedProductId: z.string().uuid().optional(),
  masterTitle: z.string().min(1).max(200),
  masterBody: z.string().min(1).max(5000),
  masterImages: z.array(z.string().url()).default([]),
  keywords: z.array(z.string()).default([]),
  scheduledAt: z.string().datetime().optional(),
})

export type CreateContentPostInput = z.infer<typeof CreateContentPostSchema>

// ── 채널 발행 요청 ────────────────────────────────────────────────────────────

export const PublishChannelSchema = z.object({
  channels: z.array(
    z.enum(['blog', 'instagram', 'facebook', 'threads', 'x'])
  ).min(1),
})

export type PublishChannelInput = z.infer<typeof PublishChannelSchema>

// ── 목록 조회 쿼리 ────────────────────────────────────────────────────────────

export const ListContentQuerySchema = z.object({
  sellerId: z.string().uuid().optional(),
  postStatus: z.enum(['draft', 'generating', 'ready', 'publishing', 'published', 'failed']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(20),
})

export type ListContentQuery = z.infer<typeof ListContentQuerySchema>
