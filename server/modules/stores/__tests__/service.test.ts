import { describe, it, expect, vi, beforeEach } from 'vitest'

import { initiatePayment, confirmPayment, getPaymentByKey } from '../service.js'

// ─────────────────────────────────────────────
// initiatePayment 테스트
// ─────────────────────────────────────────────

describe('initiatePayment', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    delete process.env['TOSS_PAYMENTS_SECRET_KEY']
  })

  it('장바구니 금액을 집계하고 결제 레코드를 생성한다', async () => {
    const mockDb = {
      query: vi.fn()
        .mockResolvedValueOnce({ rows: [{ total: '59800' }] }) // cart total
        .mockResolvedValueOnce({ rows: [] }), // INSERT payment
    } as any

    const result = await initiatePayment(mockDb, {
      cartId: 'cart-uuid-001',
      storeId: 'store-uuid-001',
      method: 'card',
    })

    expect(result.amount).toBe(59800)
    expect(result.paymentKey).toMatch(/^mock_/)
    expect(result.orderId).toBeDefined()
    expect(result.checkoutUrl).toContain('/mock-checkout')
  })

  it('장바구니 금액이 0이면 에러를 던진다', async () => {
    const mockDb = {
      query: vi.fn().mockResolvedValueOnce({ rows: [{ total: '0' }] }),
    } as any

    await expect(
      initiatePayment(mockDb, {
        cartId: 'cart-empty',
        storeId: 'store-001',
        method: 'card',
      })
    ).rejects.toThrow('결제 금액이 0원입니다.')
  })

  it('TOSS_PAYMENTS_SECRET_KEY가 설정되면 실제 Toss checkout URL을 반환한다', async () => {
    process.env['TOSS_PAYMENTS_SECRET_KEY'] = 'test_sk_xxx'

    const mockDb = {
      query: vi.fn()
        .mockResolvedValueOnce({ rows: [{ total: '30000' }] })
        .mockResolvedValueOnce({ rows: [] }),
    } as any

    const result = await initiatePayment(mockDb, {
      cartId: 'cart-uuid-002',
      storeId: 'store-uuid-001',
      method: 'card',
    })

    expect(result.checkoutUrl).toContain('https://pay.toss.im/checkout/')
    expect(result.amount).toBe(30000)

    delete process.env['TOSS_PAYMENTS_SECRET_KEY']
  })

  it('결제 레코드 INSERT 시 올바른 파라미터를 전달한다', async () => {
    const mockDb = {
      query: vi.fn()
        .mockResolvedValueOnce({ rows: [{ total: '25000' }] })
        .mockResolvedValueOnce({ rows: [] }),
    } as any

    await initiatePayment(mockDb, {
      cartId: 'cart-uuid-003',
      storeId: 'store-uuid-002',
      method: 'transfer',
    })

    const insertCall = mockDb.query.mock.calls[1]
    expect(insertCall[0]).toContain('INSERT INTO payments')
    // params: orderId, storeId, paymentKey, method, amount
    expect(insertCall[1][1]).toBe('store-uuid-002')
    expect(insertCall[1][3]).toBe('transfer')
    expect(insertCall[1][4]).toBe(25000)
  })
})

// ─────────────────────────────────────────────
// confirmPayment 테스트
// ─────────────────────────────────────────────

describe('confirmPayment', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    delete process.env['TOSS_PAYMENTS_SECRET_KEY']
  })

  it('Mock 모드에서는 즉시 DONE 상태로 승인 처리한다', async () => {
    const mockDb = {
      query: vi.fn().mockResolvedValue({ rows: [] }),
    } as any

    const result = await confirmPayment(mockDb, {
      paymentKey: 'mock_abc123',
      orderId: 'order-uuid-001',
      amount: 30000,
    })

    expect(result.status).toBe('DONE')
    expect(result.totalAmount).toBe(30000)
    expect(result.paymentKey).toBe('mock_abc123')
    expect(result.approvedAt).toBeDefined()
  })

  it('Mock 모드에서 payments 테이블을 approved로 업데이트한다', async () => {
    const mockDb = {
      query: vi.fn().mockResolvedValue({ rows: [] }),
    } as any

    await confirmPayment(mockDb, {
      paymentKey: 'mock_abc123',
      orderId: 'order-uuid-001',
      amount: 30000,
    })

    // 두 번째 query 호출이 UPDATE (첫 번째는 스킵 — mock이라 Toss API 미호출)
    const updateCall = mockDb.query.mock.calls.find(
      (call: any[]) => typeof call[0] === 'string' && call[0].includes('approved')
    )
    expect(updateCall).toBeDefined()
    expect(updateCall![1]).toContain('mock_abc123')
  })

  it('실제 Toss API 호출 시 fetch를 사용한다 (모킹)', async () => {
    process.env['TOSS_PAYMENTS_SECRET_KEY'] = 'test_sk_xxx'

    const originalFetch = globalThis.fetch
    globalThis.fetch = vi.fn().mockResolvedValue({
      json: () => Promise.resolve({ status: 'DONE' }),
    }) as any

    const mockDb = {
      query: vi.fn().mockResolvedValue({ rows: [] }),
    } as any

    const result = await confirmPayment(mockDb, {
      paymentKey: 'real_pk_001',
      orderId: 'order-uuid-002',
      amount: 50000,
    })

    expect(globalThis.fetch).toHaveBeenCalledWith(
      'https://api.tosspayments.com/v1/payments/confirm',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          paymentKey: 'real_pk_001',
          orderId: 'order-uuid-002',
          amount: 50000,
        }),
      })
    )
    expect(result.status).toBe('DONE')

    globalThis.fetch = originalFetch
    delete process.env['TOSS_PAYMENTS_SECRET_KEY']
  })

  it('Toss API가 DONE이 아닌 상태를 반환하면 결제 실패 처리한다', async () => {
    process.env['TOSS_PAYMENTS_SECRET_KEY'] = 'test_sk_xxx'

    const originalFetch = globalThis.fetch
    globalThis.fetch = vi.fn().mockResolvedValue({
      json: () => Promise.resolve({ status: 'CANCELED' }),
    }) as any

    const mockDb = {
      query: vi.fn().mockResolvedValue({ rows: [] }),
    } as any

    await expect(
      confirmPayment(mockDb, {
        paymentKey: 'real_pk_002',
        orderId: 'order-uuid-003',
        amount: 40000,
      })
    ).rejects.toThrow('결제 실패: CANCELED')

    // failed 상태로 업데이트되었는지 확인
    const failedCall = mockDb.query.mock.calls.find(
      (call: any[]) => typeof call[0] === 'string' && call[0].includes('failed')
    )
    expect(failedCall).toBeDefined()

    globalThis.fetch = originalFetch
    delete process.env['TOSS_PAYMENTS_SECRET_KEY']
  })
})

// ─────────────────────────────────────────────
// getPaymentByKey 테스트
// ─────────────────────────────────────────────

describe('getPaymentByKey', () => {
  it('결제 정보를 조회하여 반환한다', async () => {
    const mockDb = {
      query: vi.fn().mockResolvedValue({
        rows: [
          {
            id: 'pay-uuid-001',
            payment_key: 'mock_abc123',
            payment_status: 'approved',
            amount: 30000,
          },
        ],
      }),
    } as any

    const result = await getPaymentByKey(mockDb, 'mock_abc123')

    expect(result).toMatchObject({
      payment_key: 'mock_abc123',
      payment_status: 'approved',
    })
  })

  it('존재하지 않는 결제 키이면 에러를 던진다', async () => {
    const mockDb = {
      query: vi.fn().mockResolvedValue({ rows: [] }),
    } as any

    await expect(getPaymentByKey(mockDb, 'non-existent')).rejects.toThrow(
      '결제 정보를 찾을 수 없습니다.'
    )
  })
})
