// MarketplaceAdapter — 판매 채널(네이버 스마트스토어, 쿠팡 등) 추상화 인터페이스
// WholesaleAdapter(도매 수집)와는 별개: 상품 등록 / 주문 수집 / 송장 업로드

export interface MarketListingInput {
  processedProductId: string
  title: string
  price: number
  description?: string
  images: string[]
  options: MarketOptionInput[]
  categoryId?: string
  listingData?: Record<string, unknown>
}

export interface MarketOptionInput {
  name: string
  values: string[]
  priceAdjustments?: number[]
}

export interface MarketListingResult {
  marketProductId: string
  listingUrl?: string
  status: 'pending' | 'active' | 'rejected'
}

export interface MarketOrder {
  marketOrderId: string
  marketplace: string
  buyerName: string
  buyerPhone?: string
  buyerAddress?: string
  totalAmount: number
  commissionAmount: number
  orderedAt: Date
  items: MarketOrderItem[]
  metadata?: Record<string, unknown>
}

export interface MarketOrderItem {
  marketProductId: string
  productName: string
  optionName?: string
  quantity: number
  sellingPrice: number
  commissionRate?: number
}

export interface TrackingInfo {
  carrier: string
  trackingNumber: string
}

export interface ListingStatus {
  marketProductId: string
  status: 'active' | 'paused' | 'rejected' | 'deleted' | 'unknown'
  reason?: string
}

export interface MarketplaceAdapter {
  readonly name: 'naver' | 'coupang' | 'mock'

  /** 상품 등록 */
  createListing(product: MarketListingInput): Promise<MarketListingResult>

  /** 상품 수정 */
  updateListing(marketProductId: string, data: Partial<MarketListingInput>): Promise<void>

  /** 주문 수집 (since 이후 주문) */
  collectOrders(since: Date): Promise<MarketOrder[]>

  /** 송장 업로드 */
  uploadTracking(marketOrderId: string, tracking: TrackingInfo): Promise<void>

  /** 상품 상태 조회 */
  getListingStatus(marketProductId: string): Promise<ListingStatus>
}
