import { z } from 'zod'

// ── 도매 상품 수집 ──────────────────────────────
export const CollectProductsSchema = z.object({
  source: z.enum(['domeggook', 'mock']).default('mock'),
  keyword: z.string().optional(),
  category: z.string().optional(),
  minPrice: z.number().int().optional(),
  maxPrice: z.number().int().optional(),
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(20),
  sellerId: z.string().uuid('유효한 셀러 ID가 필요합니다'),
})

export type CollectProductsInput = z.infer<typeof CollectProductsSchema>

// ── 도매 상품 목록 조회 ──────────────────────────
export const ListWholesaleProductsSchema = z.object({
  source: z.enum(['domeggook', 'mock', 'all']).default('all'),
  supplyStatus: z.enum(['available', 'soldout', 'discontinued', 'all']).default('all'),
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(20),
})

// ── 가공 상품 목록 조회 ──────────────────────────
export const ListProcessedProductsSchema = z.object({
  sellerId: z.string().uuid().optional(),
  processingStatus: z
    .enum(['pending', 'title_done', 'image_done', 'option_done', 'completed', 'failed', 'all'])
    .default('all'),
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(20),
})

// ── AI 가공 요청 ─────────────────────────────────
export const ProcessProductSchema = z.object({
  wholesaleProductId: z.string().uuid(),
  sellerId: z.string().uuid(),
  sellingPrice: z.number().int().min(1).optional(),
  marginRate: z.number().min(0).max(100).optional(),
})

export type ProcessProductInput = z.infer<typeof ProcessProductSchema>

// ── 가공 결과 수정 ────────────────────────────────
export const UpdateProcessedProductSchema = z.object({
  title: z.string().min(1).max(100).optional(),
  hookingText: z.string().max(500).optional(),
  description: z.string().optional(),
  sellingPrice: z.number().int().min(1).optional(),
  marginRate: z.number().min(0).max(100).optional(),
  processedOptions: z
    .array(
      z.object({
        name: z.string(),
        values: z.array(z.string()),
      })
    )
    .optional(),
})

export type UpdateProcessedProductInput = z.infer<typeof UpdateProcessedProductSchema>

// ── 마켓 등록 ────────────────────────────────────
export const CreateMarketListingSchema = z.object({
  processedProductId: z.string().uuid(),
  marketplace: z.enum(['naver', 'coupang', 'store']),
  marketProductId: z.string().optional(),
  listingPrice: z.number().int().min(1),
  listingData: z.record(z.unknown()).optional(),
})

export type CreateMarketListingInput = z.infer<typeof CreateMarketListingSchema>
