import type { Pool } from 'pg'
import type {
  CreateStoreRequest,
  UpdateStoreRequest,
  AddStoreProductRequest,
  CreateCartRequest,
  AddCartItemRequest,
  UpdateCartItemRequest,
} from './schemas.js'
import { AppError } from '../../plugins/error-handler.js'

export interface Store {
  id: string
  seller_id: string
  store_name: string
  subdomain: string
  custom_domain: string | null
  logo_url: string | null
  theme_config: Record<string, unknown>
  is_active: boolean
  metadata: Record<string, unknown>
  created_at: Date
  updated_at: Date
}

export interface StoreProduct {
  id: string
  store_id: string
  listing_id: string
  display_order: number
  is_featured: boolean
  is_visible: boolean
  created_at: Date
  updated_at: Date
}

export interface Cart {
  id: string
  store_id: string
  session_id: string
  buyer_id: string | null
  status: string
  created_at: Date
  updated_at: Date
}

export interface CartItem {
  id: string
  cart_id: string
  store_product_id: string
  quantity: number
  option_data: Record<string, unknown>
  created_at: Date
  updated_at: Date
}

export async function createStore(db: Pool, data: CreateStoreRequest): Promise<Store> {
  const { rows } = await db.query<Store>(
    `INSERT INTO stores
      (seller_id, store_name, subdomain, custom_domain, logo_url, theme_config)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [
      data.sellerId,
      data.storeName,
      data.subdomain,
      data.customDomain ?? null,
      data.logoUrl ?? null,
      JSON.stringify(data.themeConfig),
    ]
  )
  return rows[0]
}

export async function getStoreBySubdomain(db: Pool, subdomain: string): Promise<Store> {
  const { rows } = await db.query<Store>(
    `SELECT * FROM stores WHERE subdomain = $1 AND is_active = true`,
    [subdomain]
  )
  if (!rows[0]) throw new AppError(404, '쇼핑몰을 찾을 수 없습니다.', 'STORE_NOT_FOUND')
  return rows[0]
}

export async function getStoreById(db: Pool, id: string): Promise<Store> {
  const { rows } = await db.query<Store>(
    `SELECT * FROM stores WHERE id = $1`,
    [id]
  )
  if (!rows[0]) throw new AppError(404, '쇼핑몰을 찾을 수 없습니다.', 'STORE_NOT_FOUND')
  return rows[0]
}

export async function updateStore(
  db: Pool,
  id: string,
  data: UpdateStoreRequest
): Promise<Store> {
  const fields: string[] = []
  const params: unknown[] = []

  if (data.storeName !== undefined) {
    params.push(data.storeName)
    fields.push(`store_name = $${params.length}`)
  }
  if (data.customDomain !== undefined) {
    params.push(data.customDomain)
    fields.push(`custom_domain = $${params.length}`)
  }
  if (data.logoUrl !== undefined) {
    params.push(data.logoUrl)
    fields.push(`logo_url = $${params.length}`)
  }
  if (data.themeConfig !== undefined) {
    params.push(JSON.stringify(data.themeConfig))
    fields.push(`theme_config = $${params.length}`)
  }
  if (data.isActive !== undefined) {
    params.push(data.isActive)
    fields.push(`is_active = $${params.length}`)
  }

  if (fields.length === 0) throw new AppError(400, '변경할 필드가 없습니다.', 'NO_FIELDS')

  params.push(id)
  const { rows } = await db.query<Store>(
    `UPDATE stores SET ${fields.join(', ')}, updated_at = NOW()
     WHERE id = $${params.length} RETURNING *`,
    params
  )
  if (!rows[0]) throw new AppError(404, '쇼핑몰을 찾을 수 없습니다.', 'STORE_NOT_FOUND')
  return rows[0]
}

export async function listStoreProducts(
  db: Pool,
  storeId: string
): Promise<StoreProduct[]> {
  const { rows } = await db.query<StoreProduct>(
    `SELECT * FROM store_products
     WHERE store_id = $1 AND is_visible = true
     ORDER BY is_featured DESC, display_order ASC`,
    [storeId]
  )
  return rows
}

export async function addStoreProduct(
  db: Pool,
  storeId: string,
  data: AddStoreProductRequest
): Promise<StoreProduct> {
  const { rows } = await db.query<StoreProduct>(
    `INSERT INTO store_products (store_id, listing_id, display_order, is_featured)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (store_id, listing_id) DO UPDATE
       SET display_order = EXCLUDED.display_order,
           is_featured = EXCLUDED.is_featured,
           updated_at = NOW()
     RETURNING *`,
    [storeId, data.listingId, data.displayOrder, data.isFeatured]
  )
  return rows[0]
}

export async function createCart(
  db: Pool,
  storeId: string,
  data: CreateCartRequest
): Promise<Cart> {
  const { rows } = await db.query<Cart>(
    `INSERT INTO carts (store_id, session_id, buyer_id)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [storeId, data.sessionId, data.buyerId ?? null]
  )
  return rows[0]
}

export async function getCart(
  db: Pool,
  storeId: string,
  sessionId: string
): Promise<Cart> {
  const { rows } = await db.query<Cart>(
    `SELECT * FROM carts
     WHERE store_id = $1 AND session_id = $2 AND status = 'active'
     ORDER BY created_at DESC LIMIT 1`,
    [storeId, sessionId]
  )
  if (!rows[0]) throw new AppError(404, '장바구니를 찾을 수 없습니다.', 'CART_NOT_FOUND')
  return rows[0]
}

export async function getCartItems(db: Pool, cartId: string): Promise<CartItem[]> {
  const { rows } = await db.query<CartItem>(
    `SELECT * FROM cart_items WHERE cart_id = $1 ORDER BY created_at ASC`,
    [cartId]
  )
  return rows
}

export async function addCartItem(
  db: Pool,
  cartId: string,
  data: AddCartItemRequest
): Promise<CartItem> {
  const { rows } = await db.query<CartItem>(
    `INSERT INTO cart_items (cart_id, store_product_id, quantity, option_data)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [cartId, data.storeProductId, data.quantity, JSON.stringify(data.optionData)]
  )
  return rows[0]
}

export async function updateCartItem(
  db: Pool,
  itemId: string,
  data: UpdateCartItemRequest
): Promise<CartItem> {
  const { rows } = await db.query<CartItem>(
    `UPDATE cart_items SET quantity = $1, updated_at = NOW()
     WHERE id = $2 RETURNING *`,
    [data.quantity, itemId]
  )
  if (!rows[0]) throw new AppError(404, '장바구니 항목을 찾을 수 없습니다.', 'CART_ITEM_NOT_FOUND')
  return rows[0]
}

export async function removeCartItem(db: Pool, itemId: string): Promise<void> {
  const { rowCount } = await db.query(
    `DELETE FROM cart_items WHERE id = $1`,
    [itemId]
  )
  if (!rowCount) throw new AppError(404, '장바구니 항목을 찾을 수 없습니다.', 'CART_ITEM_NOT_FOUND')
}
