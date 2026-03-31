'use client'

import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { useCart } from '@/components/CartProvider'
import type { CartItem } from '@/lib/types'

export function CartView({ storeId }: { storeId: string }) {
  const { cart, itemCount, isLoading, changeQuantity, deleteItem } = useCart()
  const router = useRouter()

  if (isLoading && !cart) {
    return <div className="text-center py-20 text-gray-400">장바구니 불러오는 중...</div>
  }

  if (!cart || itemCount === 0) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-400 text-lg mb-6">장바구니가 비어 있습니다.</p>
        <Link
          href="/"
          className="inline-block bg-blue-600 text-white font-bold px-8 py-3 rounded-xl hover:bg-blue-700 transition-colors"
        >
          쇼핑 계속하기
        </Link>
      </div>
    )
  }

  const totalPrice = cart.items.reduce((sum: number, item: CartItem) => {
    return sum + (item.product?.price ?? 0) * item.quantity
  }, 0)

  const goToCheckout = () => {
    router.push(`/checkout?storeId=${storeId}&cartId=${cart.id}`)
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">장바구니</h1>

      <div className="space-y-4 mb-8">
        {cart.items.map((item: CartItem) => (
          <div key={item.id} className="bg-white rounded-xl border border-gray-100 p-4 flex gap-4">
            {/* 썸네일 */}
            <div className="w-20 h-20 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
              {item.product?.thumbnailUrl ? (
                <Image
                  src={item.product.thumbnailUrl}
                  alt={item.product.title}
                  width={80}
                  height={80}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-300 text-xs">
                  이미지 없음
                </div>
              )}
            </div>

            {/* 정보 */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-800 line-clamp-2 mb-1">
                {item.product?.title}
              </p>
              {Object.entries(item.optionData).length > 0 && (
                <p className="text-xs text-gray-400 mb-2">
                  {Object.entries(item.optionData)
                    .map(([k, v]) => `${k}: ${v}`)
                    .join(' / ')}
                </p>
              )}
              <p className="text-sm font-bold text-gray-900">
                {((item.product?.price ?? 0) * item.quantity).toLocaleString()}원
              </p>
            </div>

            {/* 수량 + 삭제 */}
            <div className="flex flex-col items-end gap-2">
              <button
                onClick={() => deleteItem(item.id)}
                className="text-gray-300 hover:text-red-400 transition-colors"
                aria-label="삭제"
                disabled={isLoading}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              <div className="flex items-center gap-1.5">
                <button
                  className="w-6 h-6 rounded border border-gray-200 flex items-center justify-center text-xs text-gray-600 hover:bg-gray-50 disabled:opacity-40"
                  onClick={() => changeQuantity(item.id, item.quantity - 1)}
                  disabled={item.quantity <= 1 || isLoading}
                  aria-label="수량 감소"
                >
                  −
                </button>
                <span className="text-sm font-medium w-5 text-center">{item.quantity}</span>
                <button
                  className="w-6 h-6 rounded border border-gray-200 flex items-center justify-center text-xs text-gray-600 hover:bg-gray-50 disabled:opacity-40"
                  onClick={() => changeQuantity(item.id, item.quantity + 1)}
                  disabled={isLoading}
                  aria-label="수량 증가"
                >
                  +
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 합계 + 결제 버튼 */}
      <div className="bg-white rounded-xl border border-gray-100 p-4 sticky bottom-4">
        <div className="flex justify-between items-center mb-4">
          <span className="text-gray-600">총 결제금액</span>
          <span className="text-xl font-bold text-gray-900">{totalPrice.toLocaleString()}원</span>
        </div>
        <button
          onClick={goToCheckout}
          disabled={isLoading}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-bold py-3 rounded-xl transition-colors"
        >
          결제하기 ({itemCount}개 상품)
        </button>
      </div>
    </div>
  )
}
