import type { Pool } from 'pg'
import { randomUUID } from 'crypto'
import type { InitiatePaymentRequest, ConfirmPaymentRequest } from './schemas.js'
import { AppError } from '../../plugins/error-handler.js'

export interface PaymentInitResult {
  paymentKey: string
  orderId: string
  amount: number
  checkoutUrl: string
}

export interface PaymentConfirmResult {
  paymentKey: string
  status: string
  approvedAt: string
  totalAmount: number
}

/**
 * 토스페이먼츠 결제 시작
 * - TOSS_PAYMENTS_SECRET_KEY 없으면 Mock 응답 반환
 */
export async function initiatePayment(
  db: Pool,
  data: InitiatePaymentRequest
): Promise<PaymentInitResult> {
  // 장바구니 금액 집계
  const { rows } = await db.query<{ total: string }>(
    `SELECT COALESCE(SUM((pml.listing_data->>'selling_price')::INTEGER * ci.quantity), 0)::TEXT AS total
     FROM cart_items ci
     JOIN store_products sp ON sp.id = ci.store_product_id
     JOIN product_market_listings pml ON pml.id = sp.listing_id
     WHERE ci.cart_id = $1`,
    [data.cartId]
  )
  const amount = parseInt(rows[0]?.total ?? '0', 10)
  if (amount <= 0) throw new AppError(400, '결제 금액이 0원입니다.', 'INVALID_AMOUNT')

  const orderId = randomUUID()
  const paymentKey = `mock_${randomUUID().replace(/-/g, '')}`

  // payments 레코드 생성
  await db.query(
    `INSERT INTO payments (order_id, store_id, payment_key, method, amount, payment_status)
     VALUES ($1, $2, $3, $4, $5, 'pending')`,
    [orderId, data.storeId, paymentKey, data.method, amount]
  )

  const isMock = !process.env['TOSS_PAYMENTS_SECRET_KEY']

  return {
    paymentKey,
    orderId,
    amount,
    checkoutUrl: isMock
      ? `/mock-checkout?paymentKey=${paymentKey}&orderId=${orderId}&amount=${amount}`
      : `https://pay.toss.im/checkout/${orderId}`,
  }
}

/**
 * 토스페이먼츠 결제 확인
 * - TOSS_PAYMENTS_SECRET_KEY 없으면 Mock 승인
 */
export async function confirmPayment(
  db: Pool,
  data: ConfirmPaymentRequest
): Promise<PaymentConfirmResult> {
  const isMock = !process.env['TOSS_PAYMENTS_SECRET_KEY']

  const approvedAt = new Date().toISOString()
  const status = isMock ? 'DONE' : await callTossPaymentsConfirm(data)

  if (status !== 'DONE') {
    await db.query(
      `UPDATE payments SET payment_status = 'failed', updated_at = NOW()
       WHERE payment_key = $1`,
      [data.paymentKey]
    )
    throw new AppError(402, `결제 실패: ${status}`, 'PAYMENT_FAILED')
  }

  await db.query(
    `UPDATE payments
     SET payment_status = 'approved', approved_at = $1,
         raw_response = $2, updated_at = NOW()
     WHERE payment_key = $3`,
    [approvedAt, JSON.stringify({ status, mock: isMock }), data.paymentKey]
  )

  return { paymentKey: data.paymentKey, status, approvedAt, totalAmount: data.amount }
}

export async function getPaymentByKey(
  db: Pool,
  paymentKey: string
): Promise<Record<string, unknown>> {
  const { rows } = await db.query(
    `SELECT * FROM payments WHERE payment_key = $1`,
    [paymentKey]
  )
  if (!rows[0]) throw new AppError(404, '결제 정보를 찾을 수 없습니다.', 'PAYMENT_NOT_FOUND')
  return rows[0]
}

async function callTossPaymentsConfirm(
  data: ConfirmPaymentRequest
): Promise<string> {
  const secretKey = process.env['TOSS_PAYMENTS_SECRET_KEY']
  const encoded = Buffer.from(`${secretKey}:`).toString('base64')

  const res = await fetch('https://api.tosspayments.com/v1/payments/confirm', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${encoded}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      paymentKey: data.paymentKey,
      orderId: data.orderId,
      amount: data.amount,
    }),
  })

  const json = (await res.json()) as { status?: string }
  return json.status ?? 'UNKNOWN'
}
