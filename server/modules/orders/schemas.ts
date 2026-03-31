import { z } from 'zod'

export const listOrdersSchema = z.object({
  sellerId: z.string().uuid(),
  marketplace: z.enum(['naver', 'coupang', 'store']).optional(),
  status: z.enum(['new', 'confirmed', 'preparing', 'shipping', 'delivered', 'cancelled', 'returned', 'exchanged']).optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
})

export const updateOrderStatusSchema = z.object({
  status: z.enum(['confirmed', 'preparing', 'shipping', 'delivered', 'cancelled', 'returned', 'exchanged']),
})

export const createTrackingSchema = z.object({
  carrier: z.string().min(1),
  trackingNumber: z.string().min(1),
})

export const mockCollectOrderSchema = z.object({
  marketplace: z.enum(['naver', 'coupang', 'store']),
  sellerId: z.string().uuid(),
  count: z.number().int().min(1).max(20).default(3),
})

export type ListOrdersQuery = z.infer<typeof listOrdersSchema>
export type UpdateOrderStatusRequest = z.infer<typeof updateOrderStatusSchema>
export type CreateTrackingRequest = z.infer<typeof createTrackingSchema>
export type MockCollectOrderRequest = z.infer<typeof mockCollectOrderSchema>
