// WholesaleAdapter — 모든 도매처를 추상화하는 인터페이스

export interface WholesaleProduct {
  sourceProductId: string
  name: string
  price: number
  category?: string
  options: WholesaleOption[]
  images: string[]           // 원본 이미지 URL 목록
  detailHtml?: string
  supplyStatus: 'available' | 'soldout' | 'discontinued'
  stockQuantity?: number
  rawData?: Record<string, unknown>
}

export interface WholesaleOption {
  name: string
  values: string[]
  priceAdjustment?: number
}

export interface WholesalePaginatedResult {
  products: WholesaleProduct[]
  total: number
  page: number
  pageSize: number
  hasMore: boolean
}

export interface WholesaleSearchOptions {
  keyword?: string
  category?: string
  minPrice?: number
  maxPrice?: number
  page?: number
  pageSize?: number
}

export interface WholesaleAdapter {
  readonly name: 'domeggook' | 'dometopia' | 'ownerclan' | 'mock'

  /** 상품 목록 조회 */
  searchProducts(options: WholesaleSearchOptions): Promise<WholesalePaginatedResult>

  /** 단일 상품 상세 조회 */
  getProduct(sourceProductId: string): Promise<WholesaleProduct | null>

  /** 재고/가격 동기화 (폴링용) */
  syncProduct(sourceProductId: string): Promise<Pick<WholesaleProduct, 'supplyStatus' | 'stockQuantity' | 'price'>>
}
