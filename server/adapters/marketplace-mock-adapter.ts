import type {
  MarketplaceAdapter,
  MarketListingInput,
  MarketListingResult,
  MarketOrder,
  TrackingInfo,
  ListingStatus,
} from './marketplace-adapter.js'

const MOCK_ORDERS: MarketOrder[] = [
  {
    marketOrderId: 'MOCK-ORD-001',
    marketplace: 'naver',
    buyerName: '김구매',
    buyerPhone: '010-1234-5678',
    buyerAddress: '서울시 강남구 역삼동 123-45',
    totalAmount: 35000,
    commissionAmount: 1155,
    orderedAt: new Date(Date.now() - 3600_000),
    items: [
      {
        marketProductId: 'MOCK-PROD-001',
        productName: '프리미엄 실리콘 주방 도구 5종 세트',
        optionName: '그레이',
        quantity: 1,
        sellingPrice: 35000,
        commissionRate: 0.033,
      },
    ],
  },
  {
    marketOrderId: 'MOCK-ORD-002',
    marketplace: 'naver',
    buyerName: '이쇼핑',
    buyerPhone: '010-9876-5432',
    buyerAddress: '경기도 성남시 분당구 정자동 67-89',
    totalAmount: 52000,
    commissionAmount: 1716,
    orderedAt: new Date(Date.now() - 7200_000),
    items: [
      {
        marketProductId: 'MOCK-PROD-002',
        productName: '무선 블루투스 이어폰 Pro',
        quantity: 2,
        sellingPrice: 26000,
        commissionRate: 0.033,
      },
    ],
  },
]

export class MarketplaceMockAdapter implements MarketplaceAdapter {
  readonly name = 'mock' as const

  private listings = new Map<string, { input: MarketListingInput; status: 'active' | 'paused' }>()
  private trackingUploads = new Map<string, TrackingInfo>()

  async createListing(product: MarketListingInput): Promise<MarketListingResult> {
    const marketProductId = `MOCK-PROD-${Date.now()}`
    this.listings.set(marketProductId, { input: product, status: 'active' })
    return {
      marketProductId,
      listingUrl: `https://smartstore.naver.com/mock/products/${marketProductId}`,
      status: 'active',
    }
  }

  async updateListing(marketProductId: string, data: Partial<MarketListingInput>): Promise<void> {
    const existing = this.listings.get(marketProductId)
    if (!existing) throw new Error(`상품을 찾을 수 없습니다: ${marketProductId}`)
    this.listings.set(marketProductId, {
      ...existing,
      input: { ...existing.input, ...data },
    })
  }

  async collectOrders(since: Date): Promise<MarketOrder[]> {
    return MOCK_ORDERS.filter((o) => o.orderedAt >= since)
  }

  async uploadTracking(marketOrderId: string, tracking: TrackingInfo): Promise<void> {
    this.trackingUploads.set(marketOrderId, tracking)
  }

  async getListingStatus(marketProductId: string): Promise<ListingStatus> {
    const existing = this.listings.get(marketProductId)
    return {
      marketProductId,
      status: existing ? existing.status : 'unknown',
    }
  }
}
