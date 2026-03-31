import { z } from 'zod'

export const analyzeRequestSchema = z.object({
  keywords: z.array(z.string().min(1)).min(1).max(5),
})

export const saveKeywordSchema = z.object({
  keyword: z.string().min(1),
  searchVolume: z.number().int().min(0),
  competition: z.number().min(0).max(1),
  cgi: z.number().min(0).max(1),
  trendScore: z.number().min(0).max(1),
  oppScore: z.number().min(0).max(1),
  category: z.string().optional(),
})

export const listQuerySchema = z.object({
  status: z.enum(['active', 'archived', 'monitoring']).optional(),
  sort: z.enum(['opp_score', 'search_volume', 'created_at']).default('opp_score'),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
})

export type AnalyzeRequest = z.infer<typeof analyzeRequestSchema>
export type SaveKeywordRequest = z.infer<typeof saveKeywordSchema>
export type ListQuery = z.infer<typeof listQuerySchema>
