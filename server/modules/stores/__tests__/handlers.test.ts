import { describe, it, expect, vi, beforeEach } from 'vitest'
import Fastify from 'fastify'
import type { FastifyInstance } from 'fastify'
import { storesModule } from '../routes.js'
import errorHandlerPlugin from '../../../plugins/error-handler.js'
import type { SellerContext } from '../../../types/seller-context.js'

// -------------------------------------------------
// 의존성 모킹
// -------------------------------------------------

vi.mock('../repository.js', () => ({
  createStore: vi.fn().mockResolvedValue({
    id: 'store-uuid-001',
    sellerId: '550e8400-e29b-41d4-a716-446655440000',
    storeName: '테스트 스토어',
    subdomain: 'test-store',
    isActive: true,
  }),
  getStoreBySubdomain: vi.fn().mockResolvedValue({
    id: 'store-uuid-001',
    storeName: '테스트 스토어',
    subdomain: 'test-store',
    isActive: true,
  }),
  getStoreById: vi.fn().mockResolvedValue({
    id: 'store-uuid-001',
    storeName: '테스트 스토어',
    subdomain: 'test-store',
  }),
  updateStore: vi.fn().mockResolvedValue({
    id: 'store-uuid-001',
    storeName: '수정된 스토어',
    subdomain: 'test-store',
  }),
  listStoreProducts: vi.fn().mockResolvedValue([]),
  addStoreProduct: vi.fn().mockResolvedValue({
    id: 'sp-uuid-001',
    storeId: 'store-uuid-001',
    listingId: '550e8400-e29b-41d4-a716-446655440000',
  }),
  createCart: vi.fn().mockResolvedValue({
    id: 'cart-uuid-001',
    storeId: 'store-uuid-001',
    sessionId: 'session-abc',
  }),
  getCart: vi.fn().mockResolvedValue({
    id: 'cart-uuid-001',
    storeId: 'store-uuid-001',
  }),
  getCartItems: vi.fn().mockResolvedValue([]),
  addCartItem: vi.fn().mockResolvedValue({
    id: 'item-uuid-001',
    cartId: 'cart-uuid-001',
    storeProductId: '550e8400-e29b-41d4-a716-446655440000',
    quantity: 2,
  }),
  updateCartItem: vi.fn().mockResolvedValue({
    id: 'item-uuid-001',
    quantity: 5,
  }),
  removeCartItem: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('../service.js', () => ({
  initiatePayment: vi.fn().mockResolvedValue({
    paymentKey: 'pay-key-001',
    orderId: 'order-uuid-001',
    amount: 29900,
    status: 'ready',
  }),
  confirmPayment: vi.fn().mockResolvedValue({
    paymentKey: 'pay-key-001',
    status: 'done',
  }),
  getPaymentByKey: vi.fn().mockResolvedValue({
    paymentKey: 'pay-key-001',
    status: 'done',
    amount: 29900,
  }),
}))

// -------------------------------------------------
// 테스트 셀러 컨텍스트
// -------------------------------------------------

const TEST_SELLER: SellerContext = {
  sellerId: '550e8400-e29b-41d4-a716-446655440000',
  plan: 'starter',
  quotas: { dailyProducts: 50, dailyAnalyze: 20 },
}

// -------------------------------------------------
// 테스트 서버 헬퍼
// -------------------------------------------------

async function buildTestApp(): Promise<FastifyInstance> {
  const app = Fastify({ logger: false })

  await app.register(errorHandlerPlugin)

  app.decorate('db', {
    query: vi.fn(),
    end: vi.fn(),
  } as any)

  app.decorate('authenticate', async (request: any) => {
    request.seller = TEST_SELLER
  })

  await app.register(storesModule, { prefix: '/api/v1/stores' })
  return app
}

// -------------------------------------------------
// REST API 통합 테스트
// -------------------------------------------------

describe('POST /api/v1/stores', () => {
  let app: FastifyInstance

  beforeEach(async () => {
    app = await buildTestApp()
  })

  it('쇼핑몰을 생성하면 201을 반환한다', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/stores',
      payload: {
        sellerId: '550e8400-e29b-41d4-a716-446655440000',
        storeName: '테스트 스토어',
        subdomain: 'test-store',
      },
    })

    expect(response.statusCode).toBe(201)
    const body = response.json()
    expect(body).toHaveProperty('id', 'store-uuid-001')
    expect(body).toHaveProperty('storeName', '테스트 스토어')
  })

  it('subdomain에 대문자가 포함되면 400을 반환한다', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/stores',
      payload: {
        sellerId: '550e8400-e29b-41d4-a716-446655440000',
        storeName: '테스트',
        subdomain: 'Test-Store',
      },
    })

    expect(response.statusCode).toBe(400)
  })

  it('subdomain이 2자 이하이면 400을 반환한다', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/stores',
      payload: {
        sellerId: '550e8400-e29b-41d4-a716-446655440000',
        storeName: '테스트',
        subdomain: 'ab',
      },
    })

    expect(response.statusCode).toBe(400)
  })
})

describe('GET /api/v1/stores/by-subdomain/:subdomain', () => {
  let app: FastifyInstance

  beforeEach(async () => {
    app = await buildTestApp()
  })

  it('서브도메인으로 쇼핑몰을 조회한다', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/stores/by-subdomain/test-store',
    })

    expect(response.statusCode).toBe(200)
    const body = response.json()
    expect(body).toHaveProperty('subdomain', 'test-store')
  })
})

describe('PATCH /api/v1/stores/:id', () => {
  let app: FastifyInstance

  beforeEach(async () => {
    app = await buildTestApp()
  })

  it('쇼핑몰 정보를 수정하면 200을 반환한다', async () => {
    const response = await app.inject({
      method: 'PATCH',
      url: '/api/v1/stores/store-uuid-001',
      payload: {
        storeName: '수정된 스토어',
      },
    })

    expect(response.statusCode).toBe(200)
    const body = response.json()
    expect(body).toHaveProperty('storeName', '수정된 스토어')
  })
})

describe('POST /api/v1/stores/:id/cart', () => {
  let app: FastifyInstance

  beforeEach(async () => {
    app = await buildTestApp()
  })

  it('장바구니를 생성하면 201을 반환한다', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/stores/store-uuid-001/cart',
      payload: {
        sessionId: 'session-abc',
      },
    })

    expect(response.statusCode).toBe(201)
    const body = response.json()
    expect(body).toHaveProperty('sessionId', 'session-abc')
  })

  it('sessionId가 없으면 400을 반환한다', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/stores/store-uuid-001/cart',
      payload: {},
    })

    expect(response.statusCode).toBe(400)
  })
})

describe('POST /api/v1/stores/payments/initiate', () => {
  let app: FastifyInstance

  beforeEach(async () => {
    app = await buildTestApp()
  })

  it('결제 요청 시 201을 반환한다', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/stores/payments/initiate',
      payload: {
        cartId: '550e8400-e29b-41d4-a716-446655440000',
        storeId: '550e8400-e29b-41d4-a716-446655440000',
        method: 'card',
        buyerName: '홍길동',
        buyerPhone: '01012345678',
        buyerAddress: '서울시 강남구',
      },
    })

    expect(response.statusCode).toBe(201)
    const body = response.json()
    expect(body).toHaveProperty('paymentKey')
    expect(body).toHaveProperty('status', 'ready')
  })

  it('buyerPhone이 10자 미만이면 400을 반환한다', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/stores/payments/initiate',
      payload: {
        cartId: '550e8400-e29b-41d4-a716-446655440000',
        storeId: '550e8400-e29b-41d4-a716-446655440000',
        method: 'card',
        buyerName: '홍길동',
        buyerPhone: '123',
        buyerAddress: '서울시 강남구',
      },
    })

    expect(response.statusCode).toBe(400)
  })
})

describe('GET /api/v1/stores/:id/products', () => {
  let app: FastifyInstance

  beforeEach(async () => {
    app = await buildTestApp()
  })

  it('쇼핑몰 상품 목록을 조회한다', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/stores/store-uuid-001/products',
    })

    expect(response.statusCode).toBe(200)
    const body = response.json()
    expect(body).toHaveProperty('products')
  })
})

describe('POST /api/v1/stores/:id/products', () => {
  let app: FastifyInstance

  beforeEach(async () => {
    app = await buildTestApp()
  })

  it('쇼핑몰에 상품을 추가하면 201을 반환한다', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/stores/store-uuid-001/products',
      payload: {
        listingId: '550e8400-e29b-41d4-a716-446655440000',
        displayOrder: 1,
        isFeatured: true,
      },
    })

    expect(response.statusCode).toBe(201)
  })
})

describe('GET /api/v1/stores/:id/cart/:sessionId', () => {
  let app: FastifyInstance

  beforeEach(async () => {
    app = await buildTestApp()
  })

  it('장바구니를 조회한다', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/stores/store-uuid-001/cart/session-abc',
    })

    expect(response.statusCode).toBe(200)
    const body = response.json()
    expect(body).toHaveProperty('cart')
    expect(body).toHaveProperty('items')
  })
})

describe('POST /api/v1/stores/:id/cart/:cartId/items', () => {
  let app: FastifyInstance

  beforeEach(async () => {
    app = await buildTestApp()
  })

  it('장바구니에 상품을 추가하면 201을 반환한다', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/stores/store-uuid-001/cart/cart-uuid-001/items',
      payload: {
        storeProductId: '550e8400-e29b-41d4-a716-446655440000',
        quantity: 2,
      },
    })

    expect(response.statusCode).toBe(201)
  })
})

describe('PATCH /api/v1/stores/:id/cart/:cartId/items/:itemId', () => {
  let app: FastifyInstance

  beforeEach(async () => {
    app = await buildTestApp()
  })

  it('장바구니 상품 수량을 수정한다', async () => {
    const response = await app.inject({
      method: 'PATCH',
      url: '/api/v1/stores/store-uuid-001/cart/cart-uuid-001/items/item-uuid-001',
      payload: {
        quantity: 5,
      },
    })

    expect(response.statusCode).toBe(200)
  })
})

describe('DELETE /api/v1/stores/:id/cart/:cartId/items/:itemId', () => {
  let app: FastifyInstance

  beforeEach(async () => {
    app = await buildTestApp()
  })

  it('장바구니 상품을 삭제하면 204를 반환한다', async () => {
    const response = await app.inject({
      method: 'DELETE',
      url: '/api/v1/stores/store-uuid-001/cart/cart-uuid-001/items/item-uuid-001',
    })

    expect(response.statusCode).toBe(204)
  })
})

describe('POST /api/v1/stores/payments/confirm', () => {
  let app: FastifyInstance

  beforeEach(async () => {
    app = await buildTestApp()
  })

  it('결제 확인 시 200을 반환한다', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/stores/payments/confirm',
      payload: {
        paymentKey: 'pay-key-001',
        orderId: '550e8400-e29b-41d4-a716-446655440000',
        amount: 29900,
      },
    })

    expect(response.statusCode).toBe(200)
    const body = response.json()
    expect(body).toHaveProperty('paymentKey')
  })
})

describe('GET /api/v1/stores/payments/:paymentKey', () => {
  let app: FastifyInstance

  beforeEach(async () => {
    app = await buildTestApp()
  })

  it('결제 정보를 조회한다', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/stores/payments/pay-key-001',
    })

    expect(response.statusCode).toBe(200)
    const body = response.json()
    expect(body).toHaveProperty('paymentKey', 'pay-key-001')
  })
})
