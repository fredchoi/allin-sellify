// Mock 도매 어댑터 — API 키 없을 때 개발/테스트용

import type {
  WholesaleAdapter,
  WholesaleProduct,
  WholesalePaginatedResult,
  WholesaleSearchOptions,
} from './wholesale-adapter.js'

const MOCK_PRODUCTS: WholesaleProduct[] = [
  {
    sourceProductId: 'MOCK-001',
    name: '무선 블루투스 이어폰 5.3 노이즈캔슬링',
    price: 8900,
    category: '전자기기/이어폰',
    options: [
      { name: '색상', values: ['블랙', '화이트', '핑크'] },
      { name: '패키지', values: ['기본', '프리미엄'], priceAdjustment: 2000 },
    ],
    images: [
      'https://picsum.photos/seed/earphone1/800/800',
      'https://picsum.photos/seed/earphone2/800/800',
    ],
    supplyStatus: 'available',
    stockQuantity: 500,
  },
  {
    sourceProductId: 'MOCK-002',
    name: '스마트워치 혈압/심박 측정 방수 운동 손목시계',
    price: 15900,
    category: '전자기기/스마트워치',
    options: [
      { name: '색상', values: ['블랙', '실버', '골드'] },
      { name: '사이즈', values: ['S', 'M/L'] },
    ],
    images: [
      'https://picsum.photos/seed/watch1/800/800',
      'https://picsum.photos/seed/watch2/800/800',
    ],
    supplyStatus: 'available',
    stockQuantity: 250,
  },
  {
    sourceProductId: 'MOCK-003',
    name: 'USB-C 7in1 멀티허브 HDMI 4K PD충전',
    price: 12500,
    category: '전자기기/주변기기',
    options: [
      { name: '포트구성', values: ['7in1', '9in1'], priceAdjustment: 5000 },
    ],
    images: [
      'https://picsum.photos/seed/hub1/800/800',
    ],
    supplyStatus: 'available',
    stockQuantity: 180,
  },
  {
    sourceProductId: 'MOCK-004',
    name: '자동차 핸드폰 거치대 마그네틱 15W 고속무선충전',
    price: 9800,
    category: '자동차/액세서리',
    options: [
      { name: '설치방식', values: ['에어벤트', '대시보드', '흡착식'] },
    ],
    images: [
      'https://picsum.photos/seed/carhold1/800/800',
    ],
    supplyStatus: 'available',
    stockQuantity: 320,
  },
  {
    sourceProductId: 'MOCK-005',
    name: '주방 접이식 스텝 사다리 3단 미끄럼방지',
    price: 24900,
    category: '가정용품/사다리',
    options: [
      { name: '단수', values: ['2단', '3단', '4단'], priceAdjustment: 5000 },
      { name: '색상', values: ['그레이', '화이트'] },
    ],
    images: [
      'https://picsum.photos/seed/ladder1/800/800',
    ],
    supplyStatus: 'soldout',
    stockQuantity: 0,
  },
]

function delay(ms = 100): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export class WholesaleMockAdapter implements WholesaleAdapter {
  readonly name = 'mock' as const

  async searchProducts(options: WholesaleSearchOptions): Promise<WholesalePaginatedResult> {
    await delay()

    let filtered = MOCK_PRODUCTS

    if (options.keyword) {
      const kw = options.keyword.toLowerCase()
      filtered = filtered.filter((p) => p.name.toLowerCase().includes(kw))
    }
    if (options.category) {
      filtered = filtered.filter((p) => p.category?.includes(options.category!))
    }
    if (options.minPrice !== undefined) {
      filtered = filtered.filter((p) => p.price >= options.minPrice!)
    }
    if (options.maxPrice !== undefined) {
      filtered = filtered.filter((p) => p.price <= options.maxPrice!)
    }

    const page = options.page ?? 1
    const pageSize = options.pageSize ?? 20
    const start = (page - 1) * pageSize
    const paged = filtered.slice(start, start + pageSize)

    return {
      products: paged,
      total: filtered.length,
      page,
      pageSize,
      hasMore: start + pageSize < filtered.length,
    }
  }

  async getProduct(sourceProductId: string): Promise<WholesaleProduct | null> {
    await delay()
    return MOCK_PRODUCTS.find((p) => p.sourceProductId === sourceProductId) ?? null
  }

  async syncProduct(sourceProductId: string) {
    await delay()
    const product = MOCK_PRODUCTS.find((p) => p.sourceProductId === sourceProductId)
    if (!product) {
      throw new Error(`Mock 상품 없음: ${sourceProductId}`)
    }
    return {
      supplyStatus: product.supplyStatus,
      stockQuantity: product.stockQuantity,
      price: product.price,
    }
  }
}
