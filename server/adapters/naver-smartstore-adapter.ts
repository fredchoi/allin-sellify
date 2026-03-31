// 네이버 커머스 API v2 — 스마트스토어 상품 등록 / 주문 수집 / 송장 업로드
// API 문서: https://apicenter.commerce.naver.com/ko/basic/commerce-api

import { createHmac } from 'node:crypto'
import { config } from '../config.js'
import type {
  MarketplaceAdapter,
  MarketListingInput,
  MarketListingResult,
  MarketOrder,
  MarketOrderItem,
  TrackingInfo,
  ListingStatus,
} from './marketplace-adapter.js'

const BASE_URL = 'https://api.commerce.naver.com/external'

interface TokenCache {
  accessToken: string
  expiresAt: number
}

export class NaverSmartStoreAdapter implements MarketplaceAdapter {
  readonly name = 'naver' as const
  private tokenCache: TokenCache | null = null
  private tokenRefreshPromise: Promise<string> | null = null

  constructor(
    private readonly clientId: string,
    private readonly clientSecret: string,
  ) {}

  // ── OAuth2 토큰 관리 (in-memory mutex로 race condition 방지) ────

  private async getAccessToken(): Promise<string> {
    if (this.tokenCache && Date.now() < this.tokenCache.expiresAt - 60_000) {
      return this.tokenCache.accessToken
    }

    // 이미 토큰 갱신 중이면 기존 Promise 재사용 (mutex)
    if (this.tokenRefreshPromise) {
      return this.tokenRefreshPromise
    }

    this.tokenRefreshPromise = this.refreshToken()
    try {
      return await this.tokenRefreshPromise
    } finally {
      this.tokenRefreshPromise = null
    }
  }

  private async refreshToken(): Promise<string> {
    const timestamp = Date.now()
    const signature = this.generateSignature(timestamp)

    const params = new URLSearchParams({
      client_id: this.clientId,
      timestamp: String(timestamp),
      client_secret_sign: signature,
      grant_type: 'client_credentials',
      type: 'SELF',
    })

    const res = await fetch(`${BASE_URL}/v1/oauth2/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    })

    if (!res.ok) {
      const text = await res.text()
      throw new Error(`네이버 OAuth 토큰 발급 실패: ${res.status} ${text}`)
    }

    const data = (await res.json()) as {
      access_token: string
      expires_in: number
      token_type: string
    }

    this.tokenCache = {
      accessToken: data.access_token,
      expiresAt: Date.now() + data.expires_in * 1000,
    }

    return this.tokenCache.accessToken
  }

  private generateSignature(timestamp: number): string {
    const message = `${this.clientId}_${timestamp}`
    return createHmac('sha256', this.clientSecret)
      .update(message)
      .digest('base64')
  }

  private async request<T>(
    method: string,
    path: string,
    body?: unknown
  ): Promise<T> {
    const token = await this.getAccessToken()
    const url = `${BASE_URL}${path}`

    const headers: Record<string, string> = {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    }

    const res = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    })

    if (!res.ok) {
      const text = await res.text()
      throw new Error(`네이버 API 오류 [${method} ${path}]: ${res.status} ${text}`)
    }

    return (await res.json()) as T
  }

  // ── 상품 등록 ─────────────────────────────────────────────────

  async createListing(product: MarketListingInput): Promise<MarketListingResult> {
    const payload = {
      originProduct: {
        statusType: 'SALE',
        saleType: 'NEW',
        leafCategoryId: product.categoryId ?? '50000803',
        name: product.title,
        salePrice: product.price,
        stockQuantity: 999,
        detailContent: product.description ?? '',
        images: {
          representativeImage: product.images[0]
            ? { url: product.images[0] }
            : undefined,
          optionalImages: product.images.slice(1, 10).map((url) => ({ url })),
        },
        detailAttribute: {},
      },
      smartstoreChannelProduct: {
        channelProductName: product.title,
        naverShoppingRegistration: true,
      },
    }

    const data = await this.request<{
      smartstoreChannelProductNo: string
      originProductNo: string
    }>('POST', '/v2/products', payload)

    return {
      marketProductId: data.originProductNo,
      listingUrl: `https://smartstore.naver.com/products/${data.smartstoreChannelProductNo}`,
      status: 'active',
    }
  }

  // ── 상품 수정 ─────────────────────────────────────────────────

  async updateListing(
    marketProductId: string,
    data: Partial<MarketListingInput>
  ): Promise<void> {
    const payload: Record<string, unknown> = {
      originProduct: {} as Record<string, unknown>,
    }

    const originProduct = payload['originProduct'] as Record<string, unknown>

    if (data.title) originProduct['name'] = data.title
    if (data.price) originProduct['salePrice'] = data.price
    if (data.description) originProduct['detailContent'] = data.description

    await this.request('PATCH', `/v2/products/origin-products/${marketProductId}`, payload)
  }

  // ── 주문 수집 ─────────────────────────────────────────────────

  async collectOrders(since: Date): Promise<MarketOrder[]> {
    const data = await this.request<{
      data: { contents: NaverOrderResponse[] }
    }>('GET', `/v1/pay-order/seller/orders/last-changed-statuses?lastChangedFrom=${since.toISOString()}&limitCount=300`)

    const orders = data.data?.contents ?? []
    return orders.map((o) => this.mapOrder(o))
  }

  private mapOrder(raw: NaverOrderResponse): MarketOrder {
    const items: MarketOrderItem[] = (raw.productOrderDetails ?? []).map((d) => ({
      marketProductId: d.productId ?? '',
      productName: d.productName ?? '',
      optionName: d.optionContent ?? undefined,
      quantity: d.quantity ?? 1,
      sellingPrice: d.totalPaymentAmount ?? 0,
      commissionRate: d.commissionRate ?? undefined,
    }))

    return {
      marketOrderId: raw.orderId,
      marketplace: 'naver',
      buyerName: raw.buyerName ?? '',
      buyerPhone: raw.buyerTel ?? undefined,
      buyerAddress: raw.shippingAddress?.baseAddress ?? undefined,
      totalAmount: raw.paymentAmount ?? 0,
      commissionAmount: raw.commissionAmount ?? 0,
      orderedAt: new Date(raw.orderDate ?? Date.now()),
      items,
      metadata: { raw },
    }
  }

  // ── 송장 업로드 ───────────────────────────────────────────────

  async uploadTracking(
    marketOrderId: string,
    tracking: TrackingInfo
  ): Promise<void> {
    await this.request('POST', `/v1/pay-order/seller/orders/${marketOrderId}/ship`, {
      deliveryMethod: 'DELIVERY',
      deliveryCompanyCode: tracking.carrier,
      trackingNumber: tracking.trackingNumber,
    })
  }

  // ── 상품 상태 조회 ────────────────────────────────────────────

  async getListingStatus(marketProductId: string): Promise<ListingStatus> {
    const data = await this.request<{
      originProduct: { statusType: string }
    }>('GET', `/v2/products/origin-products/${marketProductId}`)

    const statusMap: Record<string, ListingStatus['status']> = {
      SALE: 'active',
      SUSPENSION: 'paused',
      REJECTION: 'rejected',
      DELETE: 'deleted',
    }

    return {
      marketProductId,
      status: statusMap[data.originProduct?.statusType] ?? 'unknown',
    }
  }
}

// ── 네이버 주문 응답 타입 ─────────────────────────────────────────

interface NaverOrderResponse {
  orderId: string
  buyerName?: string
  buyerTel?: string
  shippingAddress?: { baseAddress?: string }
  paymentAmount?: number
  commissionAmount?: number
  orderDate?: string
  productOrderDetails?: Array<{
    productId?: string
    productName?: string
    optionContent?: string
    quantity?: number
    totalPaymentAmount?: number
    commissionRate?: number
  }>
}
