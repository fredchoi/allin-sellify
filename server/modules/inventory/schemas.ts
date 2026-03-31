import { z } from 'zod'

export const listInventorySchema = z.object({
  sellerId: z.string().uuid(),
  tier: z.enum(['tier1', 'tier2', 'tier3']).optional(),
  status: z.enum(['active', 'paused', 'error']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
})

export const updateTierSchema = z.object({
  tier: z.enum(['tier1', 'tier2', 'tier3']),
})

export type ListInventoryQuery = z.infer<typeof listInventorySchema>
export type UpdateTierRequest = z.infer<typeof updateTierSchema>
