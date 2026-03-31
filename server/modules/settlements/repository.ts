import type { Pool } from 'pg'
import type {
  ListSettlementsQuery,
  CalculateSettlementRequest,
  CreateFeeRuleRequest,
  ListFeeRulesQuery,
} from './schemas.js'
import { AppError } from '../../plugins/error-handler.js'

export interface Settlement {
  id: string
  seller_id: string
  marketplace: string
  period_start: string
  period_end: string
  total_sales: number
  total_commission: number
  total_wholesale: number
  net_profit: number
  settlement_status: string
  settled_at: Date | null
  details: Record<string, unknown>
  created_at: Date
  updated_at: Date
}

export interface MarketFeeRule {
  id: string
  marketplace: string
  category: string | null
  fee_rate: string
  fee_type: string
  effective_from: Date
  effective_to: Date | null
  created_at: Date
}

export async function listSettlements(
  db: Pool,
  query: ListSettlementsQuery
): Promise<{ settlements: Settlement[]; total: number }> {
  const conditions = ['seller_id = $1']
  const params: unknown[] = [query.sellerId]

  if (query.marketplace) {
    conditions.push(`marketplace = $${params.length + 1}`)
    params.push(query.marketplace)
  }
  if (query.status) {
    conditions.push(`settlement_status = $${params.length + 1}`)
    params.push(query.status)
  }
  if (query.from) {
    conditions.push(`period_start >= $${params.length + 1}`)
    params.push(query.from)
  }
  if (query.to) {
    conditions.push(`period_end <= $${params.length + 1}`)
    params.push(query.to)
  }

  const where = conditions.join(' AND ')
  const offset = (query.page - 1) * query.limit

  const [dataRes, countRes] = await Promise.all([
    db.query<Settlement>(
      `SELECT * FROM settlements WHERE ${where}
       ORDER BY period_start DESC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, query.limit, offset]
    ),
    db.query<{ count: string }>(
      `SELECT COUNT(*) FROM settlements WHERE ${where}`,
      params
    ),
  ])

  return {
    settlements: dataRes.rows,
    total: parseInt(countRes.rows[0].count, 10),
  }
}

export async function getSettlementById(db: Pool, id: string): Promise<Settlement> {
  const { rows } = await db.query<Settlement>(
    `SELECT * FROM settlements WHERE id = $1`,
    [id]
  )
  if (!rows[0]) throw new AppError(404, '정산 내역을 찾을 수 없습니다.', 'SETTLEMENT_NOT_FOUND')
  return rows[0]
}

export async function upsertSettlement(
  db: Pool,
  req: CalculateSettlementRequest,
  totals: {
    totalSales: number
    totalCommission: number
    totalWholesale: number
    netProfit: number
    details: Record<string, unknown>
  }
): Promise<Settlement> {
  const { rows } = await db.query<Settlement>(
    `INSERT INTO settlements
      (seller_id, marketplace, period_start, period_end,
       total_sales, total_commission, total_wholesale, net_profit,
       settlement_status, details)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pending', $9)
     ON CONFLICT DO NOTHING
     RETURNING *`,
    [
      req.sellerId,
      req.marketplace,
      req.periodStart,
      req.periodEnd,
      totals.totalSales,
      totals.totalCommission,
      totals.totalWholesale,
      totals.netProfit,
      JSON.stringify(totals.details),
    ]
  )
  if (!rows[0]) {
    // 이미 존재하면 업데이트
    const { rows: updated } = await db.query<Settlement>(
      `UPDATE settlements
       SET total_sales = $5, total_commission = $6, total_wholesale = $7,
           net_profit = $8, details = $9, updated_at = NOW()
       WHERE seller_id = $1 AND marketplace = $2
         AND period_start = $3 AND period_end = $4
       RETURNING *`,
      [
        req.sellerId,
        req.marketplace,
        req.periodStart,
        req.periodEnd,
        totals.totalSales,
        totals.totalCommission,
        totals.totalWholesale,
        totals.netProfit,
        JSON.stringify(totals.details),
      ]
    )
    return updated[0]
  }
  return rows[0]
}

export async function listFeeRules(
  db: Pool,
  query: ListFeeRulesQuery
): Promise<MarketFeeRule[]> {
  const conditions: string[] = []
  const params: unknown[] = []

  if (query.marketplace) {
    conditions.push(`marketplace = $${params.length + 1}`)
    params.push(query.marketplace)
  }
  if (query.at) {
    conditions.push(`effective_from <= $${params.length + 1}`)
    params.push(query.at)
    conditions.push(`(effective_to IS NULL OR effective_to >= $${params.length})`)
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

  const { rows } = await db.query<MarketFeeRule>(
    `SELECT * FROM market_fee_rules ${where} ORDER BY marketplace, effective_from DESC`,
    params
  )
  return rows
}

export async function createFeeRule(
  db: Pool,
  data: CreateFeeRuleRequest
): Promise<MarketFeeRule> {
  const { rows } = await db.query<MarketFeeRule>(
    `INSERT INTO market_fee_rules
      (marketplace, category, fee_rate, fee_type, effective_from, effective_to)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [
      data.marketplace,
      data.category ?? null,
      data.feeRate,
      data.feeType,
      data.effectiveFrom,
      data.effectiveTo ?? null,
    ]
  )
  return rows[0]
}

export async function getFeeRuleAtTime(
  db: Pool,
  marketplace: string,
  at: Date,
  category?: string
): Promise<MarketFeeRule | null> {
  const params: unknown[] = [marketplace, at]
  let categoryCondition = ''

  if (category) {
    params.push(category)
    categoryCondition = `AND (category = $3 OR category IS NULL)`
  }

  const { rows } = await db.query<MarketFeeRule>(
    `SELECT * FROM market_fee_rules
     WHERE marketplace = $1
       AND effective_from <= $2
       AND (effective_to IS NULL OR effective_to >= $2)
       ${categoryCondition}
     ORDER BY category NULLS LAST, effective_from DESC
     LIMIT 1`,
    params
  )
  return rows[0] ?? null
}
