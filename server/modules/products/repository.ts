import type { Pool } from 'pg'
import type { WholesaleProduct } from '../../adapters/wholesale-adapter.js'

// ── 도매 상품 저장/조회 ─────────────────────────────────────────────────────

export async function upsertWholesaleProduct(
  db: Pool,
  product: WholesaleProduct & { source: string }
): Promise<string> {
  const result = await db.query<{ id: string }>(
    `INSERT INTO wholesale_products
       (source, source_product_id, name, price, category, options, images,
        detail_html, supply_status, stock_quantity,
        fingerprint_text, fingerprint_hash, raw_data, last_synced_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,NOW())
     ON CONFLICT (source, source_product_id) DO UPDATE SET
       name           = EXCLUDED.name,
       price          = EXCLUDED.price,
       category       = EXCLUDED.category,
       options        = EXCLUDED.options,
       images         = EXCLUDED.images,
       supply_status  = EXCLUDED.supply_status,
       stock_quantity = EXCLUDED.stock_quantity,
       raw_data       = EXCLUDED.raw_data,
       last_synced_at = NOW(),
       updated_at     = NOW()
     RETURNING id`,
    [
      product.source,
      product.sourceProductId,
      product.name,
      product.price,
      product.category ?? null,
      JSON.stringify(product.options),
      JSON.stringify(product.images),
      product.detailHtml ?? null,
      product.supplyStatus,
      product.stockQuantity ?? null,
      null, // fingerprint_text — 별도 처리
      null, // fingerprint_hash — 별도 처리
      JSON.stringify(product.rawData ?? {}),
    ]
  )
  return result.rows[0].id
}

export async function updateWholesaleFingerprint(
  db: Pool,
  id: string,
  textFingerprint: string,
  imageHash: string
): Promise<void> {
  await db.query(
    `UPDATE wholesale_products
     SET fingerprint_text = $2, fingerprint_hash = $3, updated_at = NOW()
     WHERE id = $1`,
    [id, textFingerprint, imageHash]
  )
}

export async function listWholesaleProducts(
  db: Pool,
  opts: { source?: string; supplyStatus?: string; page: number; pageSize: number }
): Promise<{ products: WholesaleProductRow[]; total: number }> {
  const conditions: string[] = []
  const values: unknown[] = []
  let idx = 1

  if (opts.source && opts.source !== 'all') {
    conditions.push(`source = $${idx++}`)
    values.push(opts.source)
  }
  if (opts.supplyStatus && opts.supplyStatus !== 'all') {
    conditions.push(`supply_status = $${idx++}`)
    values.push(opts.supplyStatus)
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''
  const offset = (opts.page - 1) * opts.pageSize

  const [rows, count] = await Promise.all([
    db.query<WholesaleProductRow>(
      `SELECT * FROM wholesale_products ${where}
       ORDER BY created_at DESC
       LIMIT $${idx} OFFSET $${idx + 1}`,
      [...values, opts.pageSize, offset]
    ),
    db.query<{ count: string }>(
      `SELECT COUNT(*)::text FROM wholesale_products ${where}`,
      values
    ),
  ])

  return { products: rows.rows, total: Number(count.rows[0].count) }
}

export async function getWholesaleProductById(db: Pool, id: string) {
  const result = await db.query<WholesaleProductRow>(
    'SELECT * FROM wholesale_products WHERE id = $1',
    [id]
  )
  return result.rows[0] ?? null
}

// ── 가공 상품 ───────────────────────────────────────────────────────────────

export async function createProcessedProduct(
  db: Pool,
  data: {
    sellerId: string
    wholesaleProductId: string
    sellingPrice?: number
    marginRate?: number
  }
): Promise<string> {
  const result = await db.query<{ id: string }>(
    `INSERT INTO processed_products
       (seller_id, wholesale_product_id, selling_price, margin_rate,
        processing_status, processing_checkpoints)
     VALUES ($1,$2,$3,$4,'pending','{}')
     ON CONFLICT (seller_id, wholesale_product_id) DO UPDATE SET
       selling_price = COALESCE(EXCLUDED.selling_price, processed_products.selling_price),
       updated_at = NOW()
     RETURNING id`,
    [data.sellerId, data.wholesaleProductId, data.sellingPrice ?? null, data.marginRate ?? null]
  )
  return result.rows[0].id
}

export async function updateProcessedProduct(
  db: Pool,
  id: string,
  data: {
    title?: string
    hookingText?: string
    description?: string
    processedImages?: unknown[]
    processedOptions?: unknown[]
    sellingPrice?: number
    marginRate?: number
    processingStatus?: string
    processingCheckpoints?: Record<string, unknown>
  }
): Promise<void> {
  const sets: string[] = ['updated_at = NOW()']
  const values: unknown[] = []
  let idx = 1

  if (data.title !== undefined) { sets.push(`title = $${idx++}`); values.push(data.title) }
  if (data.hookingText !== undefined) { sets.push(`hooking_text = $${idx++}`); values.push(data.hookingText) }
  if (data.description !== undefined) { sets.push(`description = $${idx++}`); values.push(data.description) }
  if (data.processedImages !== undefined) { sets.push(`processed_images = $${idx++}`); values.push(JSON.stringify(data.processedImages)) }
  if (data.processedOptions !== undefined) { sets.push(`processed_options = $${idx++}`); values.push(JSON.stringify(data.processedOptions)) }
  if (data.sellingPrice !== undefined) { sets.push(`selling_price = $${idx++}`); values.push(data.sellingPrice) }
  if (data.marginRate !== undefined) { sets.push(`margin_rate = $${idx++}`); values.push(data.marginRate) }
  if (data.processingStatus !== undefined) { sets.push(`processing_status = $${idx++}`); values.push(data.processingStatus) }
  if (data.processingCheckpoints !== undefined) {
    sets.push(`processing_checkpoints = $${idx++}`)
    values.push(JSON.stringify(data.processingCheckpoints))
  }

  values.push(id)
  await db.query(
    `UPDATE processed_products SET ${sets.join(', ')} WHERE id = $${idx}`,
    values
  )
}

export async function listProcessedProducts(
  db: Pool,
  opts: { sellerId?: string; processingStatus?: string; page: number; pageSize: number }
): Promise<{ products: ProcessedProductRow[]; total: number }> {
  const conditions: string[] = []
  const values: unknown[] = []
  let idx = 1

  if (opts.sellerId) {
    conditions.push(`pp.seller_id = $${idx++}`)
    values.push(opts.sellerId)
  }
  if (opts.processingStatus && opts.processingStatus !== 'all') {
    conditions.push(`pp.processing_status = $${idx++}`)
    values.push(opts.processingStatus)
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''
  const offset = (opts.page - 1) * opts.pageSize

  const [rows, count] = await Promise.all([
    db.query<ProcessedProductRow>(
      `SELECT pp.*, wp.name AS wholesale_name, wp.price AS wholesale_price,
              wp.images AS wholesale_images, wp.source AS wholesale_source
       FROM processed_products pp
       JOIN wholesale_products wp ON pp.wholesale_product_id = wp.id
       ${where}
       ORDER BY pp.created_at DESC
       LIMIT $${idx} OFFSET $${idx + 1}`,
      [...values, opts.pageSize, offset]
    ),
    db.query<{ count: string }>(
      `SELECT COUNT(*)::text FROM processed_products pp ${where}`,
      values
    ),
  ])

  return { products: rows.rows, total: Number(count.rows[0].count) }
}

export async function getProcessedProductById(db: Pool, id: string) {
  const result = await db.query<ProcessedProductRow>(
    `SELECT pp.*, wp.name AS wholesale_name, wp.price AS wholesale_price,
            wp.images AS wholesale_images, wp.source AS wholesale_source,
            wp.options AS wholesale_options
     FROM processed_products pp
     JOIN wholesale_products wp ON pp.wholesale_product_id = wp.id
     WHERE pp.id = $1`,
    [id]
  )
  return result.rows[0] ?? null
}

// ── 마켓 등록 ───────────────────────────────────────────────────────────────

export async function createOrUpdateMarketListing(
  db: Pool,
  data: {
    processedProductId: string
    marketplace: string
    marketProductId?: string
    listingPrice: number
    listingData?: Record<string, unknown>
  }
): Promise<string> {
  const result = await db.query<{ id: string }>(
    `INSERT INTO product_market_listings
       (processed_product_id, marketplace, market_product_id,
        listing_price, listing_data, listing_status)
     VALUES ($1,$2,$3,$4,$5,'draft')
     ON CONFLICT (processed_product_id, marketplace) DO UPDATE SET
       market_product_id = COALESCE(EXCLUDED.market_product_id, product_market_listings.market_product_id),
       listing_price     = EXCLUDED.listing_price,
       listing_data      = COALESCE(EXCLUDED.listing_data, product_market_listings.listing_data),
       updated_at        = NOW()
     RETURNING id`,
    [
      data.processedProductId,
      data.marketplace,
      data.marketProductId ?? null,
      data.listingPrice,
      JSON.stringify(data.listingData ?? {}),
    ]
  )
  return result.rows[0].id
}

export async function listMarketListings(db: Pool, processedProductId: string) {
  const result = await db.query(
    `SELECT * FROM product_market_listings
     WHERE processed_product_id = $1
     ORDER BY marketplace`,
    [processedProductId]
  )
  return result.rows
}

// ── 타입 정의 ───────────────────────────────────────────────────────────────

export interface WholesaleProductRow {
  id: string
  source: string
  source_product_id: string
  name: string
  price: number
  category: string | null
  options: unknown
  images: unknown
  supply_status: string
  stock_quantity: number | null
  fingerprint_text: string | null
  fingerprint_hash: string | null
  last_synced_at: string | null
  created_at: string
  updated_at: string
}

export interface ProcessedProductRow {
  id: string
  seller_id: string
  wholesale_product_id: string
  title: string | null
  hooking_text: string | null
  description: string | null
  processed_images: unknown
  processed_options: unknown
  selling_price: number | null
  margin_rate: string | null
  processing_status: string
  processing_checkpoints: unknown
  created_at: string
  updated_at: string
  // joined fields
  wholesale_name?: string
  wholesale_price?: number
  wholesale_images?: unknown
  wholesale_source?: string
  wholesale_options?: unknown
}
