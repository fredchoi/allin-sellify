import type { Pool } from 'pg'
import type { ListOrdersQuery, UpdateOrderStatusRequest, CreateTrackingRequest } from './schemas.js'
import { AppError } from '../../plugins/error-handler.js'

export interface Order {
  id: string
  seller_id: string
  marketplace: string
  market_order_id: string
  order_status: string
  buyer_name: string | null
  buyer_phone: string | null
  buyer_address: string | null
  total_amount: number
  commission_amount: number
  ordered_at: Date | null
  metadata: Record<string, unknown>
  created_at: Date
  updated_at: Date
  items?: OrderItem[]
}

export interface OrderItem {
  id: string
  order_id: string
  listing_id: string | null
  wholesale_product_id: string | null
  product_name: string
  option_name: string | null
  quantity: number
  selling_price: number
  wholesale_price: number
  commission_rate: string | null
  wholesale_order_id: string | null
  wholesale_order_status: string
  created_at: Date
  updated_at: Date
}

export interface Shipment {
  id: string
  order_id: string
  carrier: string | null
  tracking_number: string | null
  shipment_status: string
  shipped_at: Date | null
  delivered_at: Date | null
  metadata: Record<string, unknown>
  created_at: Date
  updated_at: Date
}

export async function listOrders(
  db: Pool,
  query: ListOrdersQuery
): Promise<{ orders: Order[]; total: number }> {
  const conditions = ['seller_id = $1']
  const params: unknown[] = [query.sellerId]

  if (query.marketplace) {
    conditions.push(`marketplace = $${params.length + 1}`)
    params.push(query.marketplace)
  }
  if (query.status) {
    conditions.push(`order_status = $${params.length + 1}`)
    params.push(query.status)
  }
  if (query.from) {
    conditions.push(`ordered_at >= $${params.length + 1}`)
    params.push(query.from)
  }
  if (query.to) {
    conditions.push(`ordered_at <= $${params.length + 1}`)
    params.push(query.to)
  }

  const where = conditions.join(' AND ')
  const offset = (query.page - 1) * query.limit

  const [dataRes, countRes] = await Promise.all([
    db.query<Order>(
      `SELECT * FROM orders WHERE ${where}
       ORDER BY ordered_at DESC NULLS LAST, created_at DESC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, query.limit, offset]
    ),
    db.query<{ count: string }>(
      `SELECT COUNT(*) FROM orders WHERE ${where}`,
      params
    ),
  ])

  return { orders: dataRes.rows, total: parseInt(countRes.rows[0].count, 10) }
}

export async function getOrderById(db: Pool, id: string): Promise<Order> {
  const [orderRes, itemsRes, shipmentRes] = await Promise.all([
    db.query<Order>(`SELECT * FROM orders WHERE id = $1`, [id]),
    db.query<OrderItem>(`SELECT * FROM order_items WHERE order_id = $1 ORDER BY created_at`, [id]),
    db.query<Shipment>(`SELECT * FROM shipments WHERE order_id = $1 ORDER BY created_at DESC LIMIT 1`, [id]),
  ])

  if (!orderRes.rows[0]) throw new AppError(404, '주문을 찾을 수 없습니다.', 'ORDER_NOT_FOUND')

  const order = orderRes.rows[0]
  order.items = itemsRes.rows
  if (shipmentRes.rows[0]) {
    (order as Order & { shipment?: Shipment }).shipment = shipmentRes.rows[0]
  }
  return order
}

export async function updateOrderStatus(
  db: Pool,
  id: string,
  data: UpdateOrderStatusRequest
): Promise<Order> {
  const { rows } = await db.query<Order>(
    `UPDATE orders SET order_status = $2, updated_at = NOW() WHERE id = $1 RETURNING *`,
    [id, data.status]
  )
  if (!rows[0]) throw new AppError(404, '주문을 찾을 수 없습니다.', 'ORDER_NOT_FOUND')
  return rows[0]
}

export async function createShipment(
  db: Pool,
  orderId: string,
  data: CreateTrackingRequest
): Promise<Shipment> {
  const client = await db.connect()
  try {
    await client.query('BEGIN')
    const { rows } = await client.query<Shipment>(
      `INSERT INTO shipments (order_id, carrier, tracking_number, shipment_status, shipped_at)
       VALUES ($1, $2, $3, 'shipped', NOW()) RETURNING *`,
      [orderId, data.carrier, data.trackingNumber]
    )
    await client.query(
      `UPDATE orders SET order_status = 'shipping', updated_at = NOW() WHERE id = $1`,
      [orderId]
    )
    await client.query('COMMIT')
    return rows[0]
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
}

export async function upsertOrderFromMarket(
  db: Pool,
  order: {
    sellerId: string
    marketplace: string
    marketOrderId: string
    buyerName?: string
    buyerPhone?: string
    buyerAddress?: string
    totalAmount: number
    commissionAmount?: number
    orderedAt?: Date
    items: Array<{
      productName: string
      optionName?: string
      quantity: number
      sellingPrice: number
      wholesalePrice?: number
      commissionRate?: number
    }>
  }
): Promise<{ order: Order; isNew: boolean }> {
  const client = await db.connect()
  try {
    await client.query('BEGIN')

    const { rows } = await client.query<Order>(
      `INSERT INTO orders
         (seller_id, marketplace, market_order_id, buyer_name, buyer_phone,
          buyer_address, total_amount, commission_amount, ordered_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT (marketplace, market_order_id) DO NOTHING
       RETURNING *`,
      [
        order.sellerId,
        order.marketplace,
        order.marketOrderId,
        order.buyerName ?? null,
        order.buyerPhone ?? null,
        order.buyerAddress ?? null,
        order.totalAmount,
        order.commissionAmount ?? 0,
        order.orderedAt ?? null,
      ]
    )

    if (!rows[0]) {
      // 이미 존재 — 조회 후 반환
      const { rows: existing } = await client.query<Order>(
        `SELECT * FROM orders WHERE marketplace = $1 AND market_order_id = $2`,
        [order.marketplace, order.marketOrderId]
      )
      await client.query('COMMIT')
      return { order: existing[0], isNew: false }
    }

    const newOrder = rows[0]

    for (const item of order.items) {
      await client.query(
        `INSERT INTO order_items
           (order_id, product_name, option_name, quantity,
            selling_price, wholesale_price, commission_rate)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          newOrder.id,
          item.productName,
          item.optionName ?? null,
          item.quantity,
          item.sellingPrice,
          item.wholesalePrice ?? 0,
          item.commissionRate ?? null,
        ]
      )
    }

    await client.query('COMMIT')
    return { order: newOrder, isNew: true }
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
}

export async function getOrderStats(
  db: Pool,
  sellerId: string
): Promise<{
  total: number
  byStatus: Record<string, number>
  byMarketplace: Record<string, number>
  todayNew: number
}> {
  const [totalRes, statusRes, marketRes, todayRes] = await Promise.all([
    db.query<{ count: string }>(`SELECT COUNT(*) FROM orders WHERE seller_id = $1`, [sellerId]),
    db.query<{ order_status: string; count: string }>(
      `SELECT order_status, COUNT(*) FROM orders WHERE seller_id = $1 GROUP BY order_status`,
      [sellerId]
    ),
    db.query<{ marketplace: string; count: string }>(
      `SELECT marketplace, COUNT(*) FROM orders WHERE seller_id = $1 GROUP BY marketplace`,
      [sellerId]
    ),
    db.query<{ count: string }>(
      `SELECT COUNT(*) FROM orders WHERE seller_id = $1 AND created_at >= CURRENT_DATE`,
      [sellerId]
    ),
  ])

  const byStatus: Record<string, number> = {}
  for (const r of statusRes.rows) byStatus[r.order_status] = parseInt(r.count)

  const byMarketplace: Record<string, number> = {}
  for (const r of marketRes.rows) byMarketplace[r.marketplace] = parseInt(r.count)

  return {
    total: parseInt(totalRes.rows[0].count),
    byStatus,
    byMarketplace,
    todayNew: parseInt(todayRes.rows[0].count),
  }
}
