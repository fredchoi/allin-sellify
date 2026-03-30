// 도매꾹 API 어댑터 (MVP)
// API 문서: https://domeggook.com/main/api/

import { z } from 'zod'
import type {
  WholesaleAdapter,
  WholesaleProduct,
  WholesalePaginatedResult,
  WholesaleSearchOptions,
} from './wholesale-adapter.js'

const DomeggookProductSchema = z.object({
  no: z.string(),
  goods_nm: z.string(),
  price: z.string().transform(Number),
  cate_nm: z.string().optional(),
  img_url: z.string().optional(),
  option_items: z.string().optional(),
  soldout_yn: z.enum(['Y', 'N']).optional(),
  stock_qty: z.string().transform(Number).optional(),
})

type DomeggookProduct = z.infer<typeof DomeggookProductSchema>

function toDomain(raw: DomeggookProduct): WholesaleProduct {
  const options = raw.option_items
    ? [{ name: '옵션', values: raw.option_items.split('|').filter(Boolean) }]
    : []

  const images = raw.img_url ? [raw.img_url] : []

  return {
    sourceProductId: raw.no,
    name: raw.goods_nm,
    price: raw.price,
    category: raw.cate_nm,
    options,
    images,
    supplyStatus: raw.soldout_yn === 'Y' ? 'soldout' : 'available',
    stockQuantity: raw.stock_qty,
    rawData: raw as unknown as Record<string, unknown>,
  }
}

export class DomeggookAdapter implements WholesaleAdapter {
  readonly name = 'domeggook' as const

  private readonly baseUrl: string
  private readonly apiKey: string

  constructor(apiKey: string, baseUrl = 'https://domeggook.com/ssl/api/') {
    if (!apiKey) throw new Error('DOMEGGOOK_API_KEY가 필요합니다')
    this.apiKey = apiKey
    this.baseUrl = baseUrl
  }

  private async request<T>(
    endpoint: string,
    params: Record<string, string>
  ): Promise<T> {
    const url = new URL(endpoint, this.baseUrl)
    url.searchParams.set('aid', this.apiKey)
    url.searchParams.set('outputType', 'json')
    for (const [k, v] of Object.entries(params)) {
      url.searchParams.set(k, v)
    }

    const res = await fetch(url.toString())
    if (!res.ok) {
      throw new Error(`도매꾹 API 오류 ${res.status}: ${await res.text()}`)
    }
    return res.json() as Promise<T>
  }

  async searchProducts(options: WholesaleSearchOptions): Promise<WholesalePaginatedResult> {
    const params: Record<string, string> = {
      mode: 'getGoodsList',
      page: String(options.page ?? 1),
      limit: String(options.pageSize ?? 20),
    }
    if (options.keyword) params['keyword'] = options.keyword
    if (options.category) params['cate'] = options.category
    if (options.minPrice) params['minPrice'] = String(options.minPrice)
    if (options.maxPrice) params['maxPrice'] = String(options.maxPrice)

    const data = await this.request<{ list: unknown[]; total_cnt: string }>('', params)

    const products = (data.list ?? [])
      .map((raw) => DomeggookProductSchema.safeParse(raw))
      .filter((r) => r.success)
      .map((r) => toDomain(r.data!))

    const total = Number(data.total_cnt ?? 0)
    const page = options.page ?? 1
    const pageSize = options.pageSize ?? 20

    return {
      products,
      total,
      page,
      pageSize,
      hasMore: page * pageSize < total,
    }
  }

  async getProduct(sourceProductId: string): Promise<WholesaleProduct | null> {
    try {
      const data = await this.request<{ goods: unknown }>('', {
        mode: 'getGoodsView',
        no: sourceProductId,
      })
      if (!data.goods) return null
      const parsed = DomeggookProductSchema.safeParse(data.goods)
      return parsed.success ? toDomain(parsed.data) : null
    } catch {
      return null
    }
  }

  async syncProduct(sourceProductId: string) {
    const product = await this.getProduct(sourceProductId)
    if (!product) {
      throw new Error(`도매꾹 상품 없음: ${sourceProductId}`)
    }
    return {
      supplyStatus: product.supplyStatus,
      stockQuantity: product.stockQuantity,
      price: product.price,
    }
  }
}
