import { headers } from 'next/headers'
import { notFound } from 'next/navigation'
import { CartProvider } from '@/components/CartProvider'
import { Header } from '@/components/Header'
import { CheckoutForm } from '@/components/CheckoutForm'
import { getStoreBySubdomain } from '@/lib/api'

const DEFAULT_SUBDOMAIN = process.env['DEFAULT_SUBDOMAIN'] ?? 'demo'

interface Props {
  searchParams: Promise<{ storeId?: string; cartId?: string }>
}

export default async function CheckoutPage({ searchParams }: Props) {
  const { cartId } = await searchParams
  const headersList = await headers()
  const subdomain = headersList.get('x-store-subdomain') ?? DEFAULT_SUBDOMAIN

  let store
  try {
    store = await getStoreBySubdomain(subdomain)
  } catch {
    return notFound()
  }

  if (!cartId) return notFound()

  return (
    <CartProvider storeId={store.id}>
      <div className="min-h-screen flex flex-col">
        <Header store={store} />
        <main className="flex-1 max-w-xl mx-auto w-full px-4 py-8">
          <CheckoutForm storeId={store.id} cartId={cartId} />
        </main>
      </div>
    </CartProvider>
  )
}
