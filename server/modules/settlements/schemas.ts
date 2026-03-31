import { z } from 'zod'

export const listSettlementsSchema = z.object({
  sellerId: z.string().uuid(),
  marketplace: z.enum(['naver', 'coupang', 'store']).optional(),
  status: z.enum(['pending', 'confirmed', 'paid', 'disputed']).optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
})

export const calculateSettlementSchema = z.object({
  sellerId: z.string().uuid(),
  marketplace: z.enum(['naver', 'coupang', 'store']),
  periodStart: z.coerce.date(),
  periodEnd: z.coerce.date(),
})

export const listFeeRulesSchema = z.object({
  marketplace: z.enum(['naver', 'coupang', 'store']).optional(),
  at: z.coerce.date().optional(),
})

export const createFeeRuleSchema = z.object({
  marketplace: z.enum(['naver', 'coupang', 'store']),
  category: z.string().optional(),
  feeRate: z.number().min(0).max(1),
  feeType: z.enum(['percentage', 'fixed']).default('percentage'),
  effectiveFrom: z.coerce.date(),
  effectiveTo: z.coerce.date().optional(),
})

export type ListSettlementsQuery = z.infer<typeof listSettlementsSchema>
export type CalculateSettlementRequest = z.infer<typeof calculateSettlementSchema>
export type ListFeeRulesQuery = z.infer<typeof listFeeRulesSchema>
export type CreateFeeRuleRequest = z.infer<typeof createFeeRuleSchema>
