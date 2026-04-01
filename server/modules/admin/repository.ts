import type { Pool } from 'pg'

// ─────────────────────────────────────────────
// 타입
// ─────────────────────────────────────────────

export interface AdminUser {
  id: string
  email: string
  name: string
  role: string
  status: string
  password_hash: string
}

export interface PlatformKpi {
  totalSellers: number
  sellersByStatus: Record<string, number>
  sellersByPlan: Record<string, number>
  todayOrders: number
  todayRevenue: number
  activeListings: number
  jobQueueStats: Record<string, number>
}

export interface SellerRow {
  id: string
  name: string
  email: string
  plan: string
  status: string
  created_at: string
}

export interface PaginatedResult<T> {
  items: T[]
  total: number
  page: number
  limit: number
}

export interface JobRow {
  id: string
  queue_name: string
  job_name: string
  status: string
  attempts: number
  max_attempts: number
  last_error: string | null
  run_at: string
  created_at: string
}

export interface SystemStats {
  tables: Array<{ name: string; rowCount: number }>
  dbSizeMb: number
}

// ─────────────────────────────────────────────
// 관리자 조회
// ─────────────────────────────────────────────

export async function findAdminByEmail(
  db: Pool,
  email: string,
): Promise<AdminUser | null> {
  const { rows } = await db.query<AdminUser>(
    'SELECT id, email, name, role, status, password_hash FROM admin_users WHERE email = $1',
    [email],
  )
  return rows[0] ?? null
}

// ─────────────────────────────────────────────
// 플랫폼 KPI (전체 셀러 집계)
// ─────────────────────────────────────────────

export async function getPlatformKpi(db: Pool): Promise<PlatformKpi> {
  const [
    sellersStatusRes,
    sellersPlanRes,
    ordersRes,
    listingsRes,
    jobsRes,
  ] = await Promise.all([
    db.query<{ status: string; count: string }>(
      `SELECT status, COUNT(*)::text AS count FROM sellers GROUP BY status`,
    ),
    db.query<{ plan: string; count: string }>(
      `SELECT plan, COUNT(*)::text AS count FROM sellers GROUP BY plan`,
    ),
    db.query<{ order_count: string; revenue: string }>(
      `SELECT
         COUNT(*)::text AS order_count,
         COALESCE(SUM(total_amount), 0)::text AS revenue
       FROM orders
       WHERE ordered_at >= CURRENT_DATE`,
    ),
    db.query<{ count: string }>(
      `SELECT COUNT(*)::text AS count
       FROM product_market_listings
       WHERE listing_status = 'active'`,
    ),
    db.query<{ status: string; count: string }>(
      `SELECT status, COUNT(*)::text AS count FROM job_queue GROUP BY status`,
    ),
  ])

  const sellersByStatus: Record<string, number> = {}
  let totalSellers = 0
  for (const row of sellersStatusRes.rows) {
    const count = parseInt(row.count, 10)
    sellersByStatus[row.status] = count
    totalSellers += count
  }

  const sellersByPlan: Record<string, number> = {}
  for (const row of sellersPlanRes.rows) {
    sellersByPlan[row.plan] = parseInt(row.count, 10)
  }

  const ordersRow = ordersRes.rows[0]

  const jobQueueStats: Record<string, number> = {}
  for (const row of jobsRes.rows) {
    jobQueueStats[row.status] = parseInt(row.count, 10)
  }

  return {
    totalSellers,
    sellersByStatus,
    sellersByPlan,
    todayOrders: parseInt(ordersRow.order_count, 10),
    todayRevenue: parseInt(ordersRow.revenue, 10),
    activeListings: parseInt(listingsRes.rows[0].count, 10),
    jobQueueStats,
  }
}

// ─────────────────────────────────────────────
// 셀러 목록 (페이지네이션 + 필터)
// ─────────────────────────────────────────────

export async function listSellers(
  db: Pool,
  opts: { page: number; limit: number; status?: string; plan?: string; search?: string },
): Promise<PaginatedResult<SellerRow>> {
  const conditions: string[] = []
  const params: unknown[] = []
  let paramIdx = 0

  if (opts.status) {
    paramIdx++
    conditions.push(`status = $${paramIdx}`)
    params.push(opts.status)
  }

  if (opts.plan) {
    paramIdx++
    conditions.push(`plan = $${paramIdx}`)
    params.push(opts.plan)
  }

  if (opts.search) {
    paramIdx++
    conditions.push(`(name ILIKE $${paramIdx} OR email ILIKE $${paramIdx})`)
    params.push(`%${opts.search}%`)
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

  const offset = (opts.page - 1) * opts.limit
  paramIdx++
  const limitParam = paramIdx
  paramIdx++
  const offsetParam = paramIdx

  const [dataRes, countRes] = await Promise.all([
    db.query<SellerRow>(
      `SELECT id, name, email, plan, status, created_at::text
       FROM sellers ${whereClause}
       ORDER BY created_at DESC
       LIMIT $${limitParam} OFFSET $${offsetParam}`,
      [...params, opts.limit, offset],
    ),
    db.query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM sellers ${whereClause}`,
      params,
    ),
  ])

  return {
    items: dataRes.rows,
    total: parseInt(countRes.rows[0].count, 10),
    page: opts.page,
    limit: opts.limit,
  }
}

// ─────────────────────────────────────────────
// 셀러 상태 변경
// ─────────────────────────────────────────────

export async function updateSellerStatus(
  db: Pool,
  id: string,
  status: string,
): Promise<SellerRow | null> {
  const { rows } = await db.query<SellerRow>(
    `UPDATE sellers SET status = $1, updated_at = NOW()
     WHERE id = $2
     RETURNING id, name, email, plan, status, created_at::text`,
    [status, id],
  )
  return rows[0] ?? null
}

// ─────────────────────────────────────────────
// 잡 큐 목록 (페이지네이션 + 필터)
// ─────────────────────────────────────────────

export async function listJobs(
  db: Pool,
  opts: { page: number; limit: number; status?: string; queueName?: string },
): Promise<PaginatedResult<JobRow>> {
  const conditions: string[] = []
  const params: unknown[] = []
  let paramIdx = 0

  if (opts.status) {
    paramIdx++
    conditions.push(`status = $${paramIdx}`)
    params.push(opts.status)
  }

  if (opts.queueName) {
    paramIdx++
    conditions.push(`queue_name = $${paramIdx}`)
    params.push(opts.queueName)
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

  const offset = (opts.page - 1) * opts.limit
  paramIdx++
  const limitParam = paramIdx
  paramIdx++
  const offsetParam = paramIdx

  const [dataRes, countRes] = await Promise.all([
    db.query<JobRow>(
      `SELECT id, queue_name, job_name, status, attempts, max_attempts,
              last_error, run_at::text, created_at::text
       FROM job_queue ${whereClause}
       ORDER BY created_at DESC
       LIMIT $${limitParam} OFFSET $${offsetParam}`,
      [...params, opts.limit, offset],
    ),
    db.query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM job_queue ${whereClause}`,
      params,
    ),
  ])

  return {
    items: dataRes.rows,
    total: parseInt(countRes.rows[0].count, 10),
    page: opts.page,
    limit: opts.limit,
  }
}

// ─────────────────────────────────────────────
// 잡 재시도 (failed → pending)
// ─────────────────────────────────────────────

export async function retryJob(
  db: Pool,
  id: string,
): Promise<JobRow | null> {
  const { rows } = await db.query<JobRow>(
    `UPDATE job_queue
     SET status = 'pending', last_error = NULL, run_at = NOW()
     WHERE id = $1 AND status = 'failed'
     RETURNING id, queue_name, job_name, status, attempts, max_attempts,
               last_error, run_at::text, created_at::text`,
    [id],
  )
  return rows[0] ?? null
}

// ─────────────────────────────────────────────
// 시스템 통계
// ─────────────────────────────────────────────

export async function getSystemStats(db: Pool): Promise<SystemStats> {
  const [tablesRes, sizeRes] = await Promise.all([
    db.query<{ table_name: string; row_count: string }>(
      `SELECT relname AS table_name, n_live_tup::text AS row_count
       FROM pg_stat_user_tables
       ORDER BY n_live_tup DESC`,
    ),
    db.query<{ size_mb: string }>(
      `SELECT pg_database_size(current_database())::numeric / (1024 * 1024) AS size_mb`,
    ),
  ])

  return {
    tables: tablesRes.rows.map((r) => ({
      name: r.table_name,
      rowCount: parseInt(r.row_count, 10),
    })),
    dbSizeMb: parseFloat(parseFloat(sizeRes.rows[0].size_mb).toFixed(2)),
  }
}
