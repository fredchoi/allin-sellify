export interface Store {
  id: string
  storeName: string
  subdomain: string
  customDomain: string | null
  logoUrl: string | null
  themeConfig: Record<string, unknown>
  isActive: boolean
}

export interface Listing {
  id: string
  listing_data: {
    title: string
    selling_price: number
    original_price?: number
    thumbnail_url?: string
    description?: string
    options?: Option[]
  }
}

export interface StoreProduct {
  id: string
  listingId: string
  displayOrder: number
  isFeatured: boolean
  listing: Listing
}

export interface Option {
  name: string
  values: string[]
}

export interface CartItem {
  id: string
  storeProductId: string
  quantity: number
  optionData: Record<string, string>
  product: {
    title: string
    price: number
    thumbnailUrl?: string
  }
}

export interface Cart {
  id: string
  sessionId: string
  items: CartItem[]
}

export interface PaymentInitResult {
  paymentKey: string
  orderId: string
  amount: number
  checkoutUrl: string
}
