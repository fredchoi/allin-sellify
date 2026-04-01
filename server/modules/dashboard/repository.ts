import type { Pool } from 'pg'

export interface KpiSummary {
  todayOrders: number
  todayRevenue: number
  activeProducts: number
  stockoutRisk: number
}

export async function getKpiSummary(
  db: Pool,
  sellerId: string
): Promise<KpiSummary> {
  const [ordersRes, listingsRes, stockoutRes] = await Promise.all([
    db.query<{ order_count: string; revenue: string }>(
      `SELECT
         COUNT(*)::text AS order_count,
         COALESCE(SUM(total_amount), 0)::text AS revenue
       FROM orders
       WHERE seller_id = $1
         AND ordered_at >= CURRENT_DATE`,
      [sellerId]
    ),
    db.query<{ count: string }>(
      `SELECT COUNT(*)::text AS count
       FROM product_market_listings
       WHERE seller_id = $1
         AND listing_status = 'active'`,
      [sellerId]
    ),
    db.query<{ count: string }>(
      `SELECT COUNT(*)::text AS count
       FROM inventory_sync_jobs isj
       JOIN wholesale_products wp ON wp.id = isj.wholesale_product_id
       JOIN processed_products pp ON pp.wholesale_product_id = wp.id
       WHERE pp.seller_id = $1
         AND isj.tier = 'tier1'`,
      [sellerId]
    ),
  ])

  const row = ordersRes.rows[0]

  return {
    todayOrders: parseInt(row.order_count, 10),
    todayRevenue: parseInt(row.revenue, 10),
    activeProducts: parseInt(listingsRes.rows[0].count, 10),
    stockoutRisk: parseInt(stockoutRes.rows[0].count, 10),
  }
}
