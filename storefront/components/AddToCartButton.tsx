'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useCart } from '@/components/CartProvider'
import type { Option } from '@/lib/types'

interface Props {
  storeProductId: string
  options: Option[]
}

export function AddToCartButton({ storeProductId, options }: Props) {
  const { addItem, isLoading } = useCart()
  const router = useRouter()
  const [quantity, setQuantity] = useState(1)
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>(() => {
    const defaults: Record<string, string> = {}
    for (const opt of options) {
      if (opt.values.length > 0) {
        defaults[opt.name] = opt.values[0]
      }
    }
    return defaults
  })

  const handleAddToCart = async () => {
    await addItem(storeProductId, quantity, selectedOptions)
    router.push('/cart')
  }

  return (
    <div className="space-y-4 mt-4">
      {/* 옵션 선택 */}
      {options.map((opt) => (
        <div key={opt.name}>
          <label className="block text-sm font-medium text-gray-700 mb-1">{opt.name}</label>
          <select
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={selectedOptions[opt.name] ?? ''}
            onChange={(e) =>
              setSelectedOptions((prev) => ({ ...prev, [opt.name]: e.target.value }))
            }
          >
            {opt.values.map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </select>
        </div>
      ))}

      {/* 수량 선택 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">수량</label>
        <div className="flex items-center gap-2">
          <button
            className="w-8 h-8 rounded-full border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-50 disabled:opacity-40"
            onClick={() => setQuantity((q) => Math.max(1, q - 1))}
            disabled={quantity <= 1}
            aria-label="수량 감소"
          >
            −
          </button>
          <span className="w-8 text-center font-semibold text-gray-900">{quantity}</span>
          <button
            className="w-8 h-8 rounded-full border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-50"
            onClick={() => setQuantity((q) => q + 1)}
            aria-label="수량 증가"
          >
            +
          </button>
        </div>
      </div>

      {/* 장바구니 버튼 */}
      <button
        onClick={handleAddToCart}
        disabled={isLoading}
        className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-bold py-3 px-6 rounded-xl transition-colors"
      >
        {isLoading ? '처리 중...' : '장바구니 담기'}
      </button>
    </div>
  )
}
