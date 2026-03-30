import { z } from 'zod'

export const createLeadSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
  plan: z.enum(['starter', 'pro', 'business']).default('pro'),
})

export type CreateLeadInput = z.infer<typeof createLeadSchema>

export interface Lead {
  id: number
  name: string
  email: string
  plan: string
  source: string
  createdAt: Date
}
