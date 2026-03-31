import { headers } from 'next/headers'
import Image from 'next/image'
import { notFound } from 'next/navigation'
import { CartProvider } from '@/components/CartProvider'
import { Header } from '@/components/Header'
import { AddToCartButton } from '@/components/AddToCartButton'
import { getStoreBySubdomain, listStoreProducts } from '@/lib/api'

// ISR: 60초마다 재검증
export const revalidate = 60

const DEFAULT_SUBDOMAIN = process.env['DEFAULT_SUBDOMAIN'] ?? 'demo'

interface Props {
  params: Promise<{ id: string }>
}

export default async function ProductDetailPage({ params }: Props) {
  const { id } = await params
  const headersList = await headers()
  const subdomain = headersList.get('x-store-subdomain') ?? DEFAULT_SUBDOMAIN

  let store
  let products

  try {
    store = await getStoreBySubdomain(subdomain)
    products = await listStoreProducts(store.id)
  } catch {
    return notFound()
  }

  const storeProduct = products.find((p) => p.id === id)
  if (!storeProduct) return notFound()

  const { listing_data } = storeProduct.listing
  const price = listing_data.selling_price
  const originalPrice = listing_data.original_price
  const discount =
    originalPrice && originalPrice > price
      ? Math.round(((originalPrice - price) / originalPrice) * 100)
      : null

  return (
    <CartProvider storeId={store.id}>
      <div className="min-h-screen flex flex-col">
        <Header store={store} />
        <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-8">
          <div className="bg-white rounded-2xl overflow-hidden border border-gray-100">
            <div className="md:flex">
              {/* 이미지 */}
              <div className="md:w-1/2 aspect-square bg-gray-100 overflow-hidden">
                {listing_data.thumbnail_url ? (
                  <Image
                    src={listing_data.thumbnail_url}
                    alt={listing_data.title}
                    width={600}
                    height={600}
                    className="w-full h-full object-cover"
                    priority
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-300">
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-20 h-20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                )}
              </div>

              {/* 상품 정보 */}
              <div className="md:w-1/2 p-6 flex flex-col justify-between">
                <div>
                  <h1 className="text-xl font-bold text-gray-900 leading-snug mb-4">
                    {listing_data.title}
                  </h1>

                  {/* 가격 */}
                  <div className="mb-6">
                    {discount && (
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-lg font-bold text-red-500">{discount}% 할인</span>
                        <span className="text-sm text-gray-400 line-through">
                          {originalPrice?.toLocaleString()}원
                        </span>
                      </div>
                    )}
                    <p className="text-3xl font-bold text-gray-900">{price.toLocaleString()}원</p>
                  </div>

                  {/* 설명 */}
                  {listing_data.description && (
                    <div className="text-sm text-gray-600 leading-relaxed border-t border-gray-100 pt-4 mb-4">
                      <p className="whitespace-pre-line">{listing_data.description}</p>
                    </div>
                  )}
                </div>

                {/* 장바구니 추가 버튼 (Client Component) */}
                <AddToCartButton
                  storeProductId={storeProduct.id}
                  options={listing_data.options ?? []}
                />
              </div>
            </div>
          </div>
        </main>
      </div>
    </CartProvider>
  )
}
