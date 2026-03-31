import { z } from 'zod'

export const createStoreSchema = z.object({
  sellerId: z.string().uuid(),
  storeName: z.string().min(1).max(100),
  subdomain: z
    .string()
    .min(3)
    .max(50)
    .regex(/^[a-z0-9-]+$/, '소문자, 숫자, 하이픈만 허용'),
  customDomain: z.string().optional(),
  logoUrl: z.string().url().optional(),
  themeConfig: z.record(z.unknown()).default({}),
})

export const updateStoreSchema = z.object({
  storeName: z.string().min(1).max(100).optional(),
  customDomain: z.string().nullable().optional(),
  logoUrl: z.string().url().nullable().optional(),
  themeConfig: z.record(z.unknown()).optional(),
  isActive: z.boolean().optional(),
})

export const addStoreProductSchema = z.object({
  listingId: z.string().uuid(),
  displayOrder: z.number().int().min(0).default(0),
  isFeatured: z.boolean().default(false),
})

export const createCartSchema = z.object({
  sessionId: z.string().min(1),
  buyerId: z.string().uuid().optional(),
})

export const addCartItemSchema = z.object({
  storeProductId: z.string().uuid(),
  quantity: z.number().int().min(1),
  optionData: z.record(z.unknown()).default({}),
})

export const updateCartItemSchema = z.object({
  quantity: z.number().int().min(1),
})

export const initiatePaymentSchema = z.object({
  cartId: z.string().uuid(),
  storeId: z.string().uuid(),
  method: z.enum(['card', 'transfer', 'virtual_account', 'phone']),
  buyerName: z.string().min(1),
  buyerPhone: z.string().min(10),
  buyerAddress: z.string().min(1),
})

export const confirmPaymentSchema = z.object({
  paymentKey: z.string().min(1),
  orderId: z.string().uuid(),
  amount: z.number().int().min(1),
})

export type CreateStoreRequest = z.infer<typeof createStoreSchema>
export type UpdateStoreRequest = z.infer<typeof updateStoreSchema>
export type AddStoreProductRequest = z.infer<typeof addStoreProductSchema>
export type CreateCartRequest = z.infer<typeof createCartSchema>
export type AddCartItemRequest = z.infer<typeof addCartItemSchema>
export type UpdateCartItemRequest = z.infer<typeof updateCartItemSchema>
export type InitiatePaymentRequest = z.infer<typeof initiatePaymentSchema>
export type ConfirmPaymentRequest = z.infer<typeof confirmPaymentSchema>
