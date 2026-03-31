import type { Pool } from 'pg'
import type { CalculateSettlementRequest } from './schemas.js'
import { upsertSettlement, getFeeRuleAtTime } from './repository.js'
import type { Settlement } from './repository.js'

interface OrderItemRow {
  id: string
  selling_price: number
  wholesale_price: number
  quantity: number
  commission_rate: string | null
  ordered_at: Date
}

export async function calculateSettlement(
  db: Pool,
  req: CalculateSettlementRequest
): Promise<Settlement> {
  // 기간 내 주문 아이템 집계
  const { rows: items } = await db.query<OrderItemRow>(
    `SELECT oi.id, oi.selling_price, oi.wholesale_price, oi.quantity,
            oi.commission_rate, o.ordered_at
     FROM order_items oi
     JOIN orders o ON o.id = oi.order_id
     WHERE o.seller_id = $1
       AND o.marketplace = $2
       AND o.ordered_at >= $3
       AND o.ordered_at <= $4
       AND o.order_status NOT IN ('cancelled', 'returned')`,
    [req.sellerId, req.marketplace, req.periodStart, req.periodEnd]
  )

  let totalSales = 0
  let totalCommission = 0
  let totalWholesale = 0

  for (const item of items) {
    const itemTotal = item.selling_price * item.quantity
    totalSales += itemTotal
    totalWholesale += item.wholesale_price * item.quantity

    // 수수료: item에 스냅샷 있으면 사용, 없으면 market_fee_rules에서 조회
    let feeRate: number
    if (item.commission_rate !== null) {
      feeRate = parseFloat(item.commission_rate)
    } else {
      const rule = await getFeeRuleAtTime(db, req.marketplace, item.ordered_at)
      feeRate = rule ? parseFloat(rule.fee_rate) : 0
    }
    totalCommission += Math.round(itemTotal * feeRate)
  }

  const netProfit = totalSales - totalCommission - totalWholesale

  return upsertSettlement(db, req, {
    totalSales,
    totalCommission,
    totalWholesale,
    netProfit,
    details: { itemCount: items.length },
  })
}
