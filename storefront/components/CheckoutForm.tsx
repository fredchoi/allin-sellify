'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { initiatePayment } from '@/lib/api'
import { clearCart } from '@/lib/cart-storage'

type PaymentMethod = 'card' | 'transfer' | 'virtual_account' | 'phone'

const PAYMENT_METHODS: { value: PaymentMethod; label: string }[] = [
  { value: 'card', label: '신용/체크카드' },
  { value: 'transfer', label: '계좌이체' },
  { value: 'virtual_account', label: '가상계좌' },
  { value: 'phone', label: '휴대폰결제' },
]

interface Props {
  storeId: string
  cartId: string
}

export function CheckoutForm({ storeId, cartId }: Props) {
  const router = useRouter()
  const [method, setMethod] = useState<PaymentMethod>('card')
  const [buyerName, setBuyerName] = useState('')
  const [buyerPhone, setBuyerPhone] = useState('')
  const [buyerAddress, setBuyerAddress] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsSubmitting(true)

    try {
      const result = await initiatePayment({
        cartId,
        storeId,
        method,
        buyerName,
        buyerPhone,
        buyerAddress,
      })

      // Mock 결제: checkoutUrl이 /mock-checkout 형태이면 바로 confirm 처리
      if (result.checkoutUrl.startsWith('/mock-checkout')) {
        const params = new URLSearchParams({
          paymentKey: result.paymentKey,
          orderId: result.orderId,
          amount: String(result.amount),
        })
        clearCart()
        router.push(`/checkout/result?${params.toString()}`)
      } else {
        // 실제 토스페이먼츠: 외부 URL로 이동
        clearCart()
        window.location.href = result.checkoutUrl
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '결제 준비 중 오류가 발생했습니다.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">주문/결제</h1>

      {/* 배송 정보 */}
      <section className="bg-white rounded-xl border border-gray-100 p-5 space-y-4">
        <h2 className="font-bold text-gray-800">배송 정보</h2>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">받는 분 이름</label>
          <input
            type="text"
            value={buyerName}
            onChange={(e) => setBuyerName(e.target.value)}
            required
            minLength={2}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="홍길동"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">연락처</label>
          <input
            type="tel"
            value={buyerPhone}
            onChange={(e) => setBuyerPhone(e.target.value)}
            required
            pattern="[0-9]{10,11}"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="01012345678"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">배송 주소</label>
          <input
            type="text"
            value={buyerAddress}
            onChange={(e) => setBuyerAddress(e.target.value)}
            required
            minLength={5}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="서울시 강남구 테헤란로 123"
          />
        </div>
      </section>

      {/* 결제 수단 */}
      <section className="bg-white rounded-xl border border-gray-100 p-5">
        <h2 className="font-bold text-gray-800 mb-3">결제 수단</h2>
        <div className="grid grid-cols-2 gap-2">
          {PAYMENT_METHODS.map((m) => (
            <label
              key={m.value}
              className={`flex items-center gap-2 border rounded-lg px-3 py-2.5 cursor-pointer transition-colors ${
                method === m.value
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-gray-200 text-gray-700 hover:bg-gray-50'
              }`}
            >
              <input
                type="radio"
                name="method"
                value={m.value}
                checked={method === m.value}
                onChange={() => setMethod(m.value)}
                className="sr-only"
              />
              <span className="text-sm font-medium">{m.label}</span>
            </label>
          ))}
        </div>
      </section>

      {error && (
        <p className="text-sm text-red-500 bg-red-50 border border-red-100 rounded-lg px-4 py-3">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-bold py-4 rounded-xl transition-colors text-lg"
      >
        {isSubmitting ? '처리 중...' : '결제하기'}
      </button>
    </form>
  )
}
