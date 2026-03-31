import { headers } from 'next/headers'
import { CartProvider } from '@/components/CartProvider'
import { Header } from '@/components/Header'
import { CartView } from '@/components/CartView'
import { getStoreBySubdomain } from '@/lib/api'
import { notFound } from 'next/navigation'

const DEFAULT_SUBDOMAIN = process.env['DEFAULT_SUBDOMAIN'] ?? 'demo'

export default async function CartPage() {
  const headersList = await headers()
  const subdomain = headersList.get('x-store-subdomain') ?? DEFAULT_SUBDOMAIN

  let store
  try {
    store = await getStoreBySubdomain(subdomain)
  } catch {
    return notFound()
  }

  return (
    <CartProvider storeId={store.id}>
      <div className="min-h-screen flex flex-col">
        <Header store={store} />
        <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-8">
          <CartView storeId={store.id} />
        </main>
      </div>
    </CartProvider>
  )
}
