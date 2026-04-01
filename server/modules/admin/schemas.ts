import { z } from 'zod'

// ─────────────────────────────────────────────
// 관리자 인증
// ─────────────────────────────────────────────

export const adminLoginSchema = z.object({
  email: z.string().email('유효한 이메일을 입력하세요.'),
  password: z.string().min(1, '비밀번호를 입력하세요.'),
})

export type AdminLoginInput = z.infer<typeof adminLoginSchema>

// ─────────────────────────────────────────────
// 셀러 관리
// ─────────────────────────────────────────────

export const listSellersQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(['active', 'suspended', 'pending']).optional(),
  plan: z.enum(['starter', 'pro', 'business']).optional(),
  search: z.string().optional(),
})

export type ListSellersQuery = z.infer<typeof listSellersQuerySchema>

export const updateSellerStatusSchema = z.object({
  status: z.enum(['active', 'suspended', 'pending']),
})

export type UpdateSellerStatusInput = z.infer<typeof updateSellerStatusSchema>

export const sellerIdParamSchema = z.object({
  id: z.string().uuid('유효한 셀러 ID를 입력하세요.'),
})

// ─────────────────────────────────────────────
// 잡 큐 관리
// ─────────────────────────────────────────────

export const listJobsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(['pending', 'processing', 'completed', 'failed']).optional(),
  queueName: z.string().optional(),
})

export type ListJobsQuery = z.infer<typeof listJobsQuerySchema>

export const jobIdParamSchema = z.object({
  id: z.string().uuid('유효한 잡 ID를 입력하세요.'),
})
