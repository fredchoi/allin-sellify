import { headers } from 'next/headers'
import Link from 'next/link'
import Image from 'next/image'
import { CartProvider } from '@/components/CartProvider'
import { Header } from '@/components/Header'
import { getStoreBySubdomain, listStoreProducts } from '@/lib/api'
import type { StoreProduct } from '@/lib/types'

// ISR: 60초마다 재검증
export const revalidate = 60

const DEFAULT_SUBDOMAIN = process.env['DEFAULT_SUBDOMAIN'] ?? 'demo'

export default async function StorePage() {
  const headersList = await headers()
  const subdomain = headersList.get('x-store-subdomain') ?? DEFAULT_SUBDOMAIN

  let store
  let products: StoreProduct[] = []

  try {
    store = await getStoreBySubdomain(subdomain)
    products = await listStoreProducts(store.id)
  } catch {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-800 mb-2">쇼핑몰을 찾을 수 없습니다</h1>
          <p className="text-gray-500">주소를 확인해 주세요.</p>
        </div>
      </div>
    )
  }

  const featuredProducts = products.filter((p) => p.isFeatured)
  const regularProducts = products.filter((p) => !p.isFeatured)

  return (
    <CartProvider storeId={store.id}>
      <div className="min-h-screen flex flex-col">
        <Header store={store} />
        <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-8">
          {products.length === 0 ? (
            <div className="text-center py-20 text-gray-400">
              <p className="text-lg">등록된 상품이 없습니다.</p>
            </div>
          ) : (
            <>
              {featuredProducts.length > 0 && (
                <section className="mb-10">
                  <h2 className="text-lg font-bold text-gray-700 mb-4">추천 상품</h2>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {featuredProducts.map((p) => (
                      <ProductCard key={p.id} product={p} />
                    ))}
                  </div>
                </section>
              )}
              <section>
                {featuredProducts.length > 0 && (
                  <h2 className="text-lg font-bold text-gray-700 mb-4">전체 상품</h2>
                )}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {(featuredProducts.length > 0 ? regularProducts : products).map((p) => (
                    <ProductCard key={p.id} product={p} />
                  ))}
                </div>
              </section>
            </>
          )}
        </main>
      </div>
    </CartProvider>
  )
}

function ProductCard({ product }: { product: StoreProduct }) {
  const { listing_data } = product.listing
  const price = listing_data.selling_price
  const originalPrice = listing_data.original_price
  const discount =
    originalPrice && originalPrice > price
      ? Math.round(((originalPrice - price) / originalPrice) * 100)
      : null

  return (
    <Link
      href={`/products/${product.id}`}
      className="group bg-white rounded-xl overflow-hidden border border-gray-100 hover:shadow-md transition-shadow"
    >
      <div className="aspect-square bg-gray-100 overflow-hidden">
        {listing_data.thumbnail_url ? (
          <Image
            src={listing_data.thumbnail_url}
            alt={listing_data.title}
            width={300}
            height={300}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-300">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
        )}
      </div>
      <div className="p-3">
        <p className="text-sm text-gray-800 line-clamp-2 leading-snug mb-1">{listing_data.title}</p>
        <div className="flex items-baseline gap-1.5">
          {discount && (
            <span className="text-xs font-bold text-red-500">{discount}%</span>
          )}
          <span className="font-bold text-gray-900">{price.toLocaleString()}원</span>
        </div>
        {originalPrice && originalPrice > price && (
          <p className="text-xs text-gray-400 line-through">{originalPrice.toLocaleString()}원</p>
        )}
      </div>
    </Link>
  )
}
