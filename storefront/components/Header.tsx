'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useCart } from '@/components/CartProvider'
import type { Store } from '@/lib/types'

export function Header({ store }: { store: Store }) {
  const { itemCount } = useCart()

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-gray-100 shadow-sm">
      <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          {store.logoUrl ? (
            <Image src={store.logoUrl} alt={store.storeName} width={32} height={32} className="rounded" />
          ) : null}
          <span className="font-bold text-gray-900 text-lg">{store.storeName}</span>
        </Link>

        <Link
          href="/cart"
          className="relative flex items-center gap-1 text-gray-600 hover:text-gray-900 transition-colors"
          aria-label="장바구니"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          {itemCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-blue-600 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center font-bold">
              {itemCount > 9 ? '9+' : itemCount}
            </span>
          )}
        </Link>
      </div>
    </header>
  )
}
