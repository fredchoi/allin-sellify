import type { Pool } from 'pg'
import type { ListInventoryQuery, UpdateTierRequest } from './schemas.js'
import { AppError } from '../../plugins/error-handler.js'

export interface InventorySyncJob {
  id: string
  wholesale_product_id: string
  tier: 'tier1' | 'tier2' | 'tier3'
  last_polled_at: Date | null
  next_poll_at: Date | null
  poll_count: number
  last_error: string | null
  status: 'active' | 'paused' | 'error'
  created_at: Date
  updated_at: Date
  // joined
  product_name?: string
  stock_quantity?: number
  supply_status?: string
}

export interface InventorySnapshot {
  id: string
  wholesale_product_id: string
  quantity: number
  price: number | null
  supply_status: string | null
  recorded_at: Date
}

const TIER_INTERVALS: Record<string, number> = {
  tier1: 10,   // minutes
  tier2: 30,
  tier3: 360,  // 6 hours
}

export async function listInventoryJobs(
  db: Pool,
  query: ListInventoryQuery
): Promise<{ jobs: InventorySyncJob[]; total: number }> {
  const conditions = ['wp.seller_id IS NOT NULL']
  const params: unknown[] = []

  // seller_id join
  conditions[0] = 'wp.seller_id = $1'
  params.push(query.sellerId)

  if (query.tier) {
    conditions.push(`isj.tier = $${params.length + 1}`)
    params.push(query.tier)
  }
  if (query.status) {
    conditions.push(`isj.status = $${params.length + 1}`)
    params.push(query.status)
  }

  const where = conditions.join(' AND ')
  const offset = (query.page - 1) * query.limit

  const [dataRes, countRes] = await Promise.all([
    db.query<InventorySyncJob>(
      `SELECT isj.*, wp.name AS product_name, wp.stock_quantity, wp.supply_status
       FROM inventory_sync_jobs isj
       JOIN wholesale_products wp ON wp.id = isj.wholesale_product_id
       WHERE ${where}
       ORDER BY isj.next_poll_at ASC NULLS LAST
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, query.limit, offset]
    ),
    db.query<{ count: string }>(
      `SELECT COUNT(*) FROM inventory_sync_jobs isj
       JOIN wholesale_products wp ON wp.id = isj.wholesale_product_id
       WHERE ${where}`,
      params
    ),
  ])

  return { jobs: dataRes.rows, total: parseInt(countRes.rows[0].count, 10) }
}

export async function getInventoryJobById(db: Pool, id: string): Promise<InventorySyncJob> {
  const { rows } = await db.query<InventorySyncJob>(
    `SELECT isj.*, wp.name AS product_name, wp.stock_quantity, wp.supply_status
     FROM inventory_sync_jobs isj
     JOIN wholesale_products wp ON wp.id = isj.wholesale_product_id
     WHERE isj.id = $1`,
    [id]
  )
  if (!rows[0]) throw new AppError(404, '재고 동기화 작업을 찾을 수 없습니다.', 'INVENTORY_JOB_NOT_FOUND')
  return rows[0]
}

export async function updateInventoryTier(
  db: Pool,
  id: string,
  data: UpdateTierRequest
): Promise<InventorySyncJob> {
  const intervalMinutes = TIER_INTERVALS[data.tier]
  const { rows } = await db.query<InventorySyncJob>(
    `UPDATE inventory_sync_jobs
     SET tier = $2, next_poll_at = NOW() + ($3 || ' minutes')::INTERVAL, updated_at = NOW()
     WHERE id = $1
     RETURNING *`,
    [id, data.tier, intervalMinutes]
  )
  if (!rows[0]) throw new AppError(404, '재고 동기화 작업을 찾을 수 없습니다.', 'INVENTORY_JOB_NOT_FOUND')
  return rows[0]
}

export async function getInventoryHistory(
  db: Pool,
  wholesaleProductId: string,
  limit = 50
): Promise<InventorySnapshot[]> {
  const { rows } = await db.query<InventorySnapshot>(
    `SELECT * FROM inventory_snapshots
     WHERE wholesale_product_id = $1
     ORDER BY recorded_at DESC
     LIMIT $2`,
    [wholesaleProductId, limit]
  )
  return rows
}

export async function recordInventorySnapshot(
  db: Pool,
  data: { wholesaleProductId: string; quantity: number; price?: number; supplyStatus?: string }
): Promise<InventorySnapshot> {
  const { rows } = await db.query<InventorySnapshot>(
    `INSERT INTO inventory_snapshots (wholesale_product_id, quantity, price, supply_status)
     VALUES ($1, $2, $3, $4) RETURNING *`,
    [data.wholesaleProductId, data.quantity, data.price ?? null, data.supplyStatus ?? null]
  )
  return rows[0]
}

export async function getJobsDueForPoll(db: Pool): Promise<InventorySyncJob[]> {
  const { rows } = await db.query<InventorySyncJob>(
    `SELECT isj.*, wp.name AS product_name, wp.stock_quantity, wp.supply_status
     FROM inventory_sync_jobs isj
     JOIN wholesale_products wp ON wp.id = isj.wholesale_product_id
     WHERE isj.status = 'active'
       AND (isj.next_poll_at IS NULL OR isj.next_poll_at <= NOW())
     ORDER BY isj.next_poll_at ASC NULLS FIRST
     LIMIT 100`
  )
  return rows
}

export async function markJobPolled(
  db: Pool,
  id: string,
  tier: string,
  error?: string
): Promise<void> {
  const intervalMinutes = TIER_INTERVALS[tier] ?? 30
  await db.query(
    `UPDATE inventory_sync_jobs
     SET last_polled_at = NOW(),
         next_poll_at = NOW() + ($2 || ' minutes')::INTERVAL,
         poll_count = poll_count + 1,
         last_error = $3,
         status = CASE WHEN $3 IS NOT NULL THEN 'error' ELSE 'active' END,
         updated_at = NOW()
     WHERE id = $1`,
    [id, intervalMinutes, error ?? null]
  )
}
