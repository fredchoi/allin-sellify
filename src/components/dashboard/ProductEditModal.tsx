import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from '../icons'
import type { ProcessedProduct } from '../../hooks/useProductsApi'

interface ProductEditModalProps {
  product: ProcessedProduct
  onClose: () => void
  onSave: (updated: ProcessedProduct) => void
}

const DEV_SELLER_ID = '00000000-0000-0000-0000-000000000001'

export function ProductEditModal({ product, onClose, onSave }: ProductEditModalProps) {
  const [title, setTitle] = useState(product.title ?? '')
  const [hookingText, setHookingText] = useState(product.hooking_text ?? '')
  const [description, setDescription] = useState(product.description ?? '')
  const [sellingPrice, setSellingPrice] = useState(product.selling_price ?? 0)
  const [saving, setSaving] = useState(false)
  const [regenerating, setRegenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const wholesalePrice = product.wholesale_price ?? 0
  const marginRate = wholesalePrice > 0 && sellingPrice > 0
    ? Math.round(((sellingPrice - wholesalePrice) / sellingPrice) * 100)
    : 0

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    },
    [onClose]
  )

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  async function handleSave() {
    if (!title.trim()) {
      setError('제목을 입력해주세요')
      return
    }
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`/api/v1/products/processed/${product.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          hookingText: hookingText.trim(),
          description: description.trim(),
          sellingPrice,
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.message ?? `저장 실패 (${res.status})`)
      }
      const updated = await res.json()
      onSave(updated)
    } catch (e) {
      setError(e instanceof Error ? e.message : '저장 중 오류가 발생했습니다')
    } finally {
      setSaving(false)
    }
  }

  async function handleRegenerate() {
    setRegenerating(true)
    setError(null)
    try {
      const res = await fetch('/api/v1/products/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wholesaleProductId: product.wholesale_product_id,
          sellerId: product.seller_id || DEV_SELLER_ID,
          sellingPrice: sellingPrice > 0 ? sellingPrice : undefined,
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.message ?? `AI 재생성 실패 (${res.status})`)
      }
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'AI 재생성 중 오류가 발생했습니다')
    } finally {
      setRegenerating(false)
    }
  }

  const images = Array.isArray(product.wholesale_images) ? product.wholesale_images : []

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Overlay */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/40"
          onClick={onClose}
        />

        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          className="relative bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
            <h2 className="text-base font-semibold text-slate-800">상품 편집</h2>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 transition-colors p-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div className="overflow-y-auto max-h-[calc(90vh-8rem)] p-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left: Editable form */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-slate-700 mb-3">AI 가공 결과 편집</h3>

                {/* 제목 */}
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">
                    제목 <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-300"
                    placeholder="상품 제목을 입력하세요"
                  />
                </div>

                {/* 후킹문구 */}
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">후킹문구</label>
                  <textarea
                    value={hookingText}
                    onChange={(e) => setHookingText(e.target.value)}
                    rows={2}
                    className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-300 resize-none"
                    placeholder="구매를 유도하는 한 줄 문구"
                  />
                </div>

                {/* 상세설명 */}
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">상세설명</label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={4}
                    className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-300 resize-none"
                    placeholder="상품 상세 설명"
                  />
                </div>

                {/* 판매가 & 마진율 */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">판매가</label>
                    <div className="relative">
                      <input
                        type="number"
                        value={sellingPrice}
                        onChange={(e) => setSellingPrice(Number(e.target.value))}
                        min={0}
                        className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 pr-8 outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-300"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">원</span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">마진율</label>
                    <div className="relative">
                      <input
                        type="number"
                        value={marginRate}
                        readOnly
                        className="w-full text-sm border border-slate-100 rounded-lg px-3 py-2 pr-8 bg-slate-50 text-slate-500 cursor-not-allowed"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">%</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right: Wholesale original info (read-only) */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-slate-700 mb-3">도매 원본 정보</h3>

                <div className="bg-slate-50 rounded-lg p-4 space-y-3">
                  <div>
                    <p className="text-xs text-slate-400 mb-0.5">도매 상품명</p>
                    <p className="text-sm text-slate-700 font-medium">
                      {product.wholesale_name ?? '-'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 mb-0.5">도매가</p>
                    <p className="text-sm text-slate-700 font-semibold">
                      {wholesalePrice > 0 ? `${wholesalePrice.toLocaleString()}원` : '-'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 mb-0.5">카테고리</p>
                    <p className="text-sm text-slate-600">
                      {(product as unknown as Record<string, string>).wholesale_category ?? '미분류'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 mb-0.5">공급상태</p>
                    <p className="text-sm text-slate-600">{product.wholesale_source ?? '-'}</p>
                  </div>
                </div>

                {/* Original images */}
                {images.length > 0 && (
                  <div>
                    <p className="text-xs text-slate-400 mb-2">원본 이미지</p>
                    <div className="grid grid-cols-3 gap-2">
                      {images.slice(0, 6).map((img, i) => (
                        <div
                          key={i}
                          className="aspect-square rounded-lg overflow-hidden bg-slate-100"
                        >
                          <img
                            src={img as string}
                            alt={`원본 이미지 ${i + 1}`}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-slate-100 bg-slate-50/50">
            <button
              onClick={onClose}
              disabled={saving || regenerating}
              className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 rounded-lg hover:bg-slate-100 transition-colors disabled:opacity-50"
            >
              취소
            </button>
            <button
              onClick={handleRegenerate}
              disabled={saving || regenerating}
              className="px-4 py-2 text-sm font-medium text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors disabled:opacity-50"
            >
              {regenerating ? 'AI 재생성 중...' : 'AI 재생성'}
            </button>
            <button
              onClick={handleSave}
              disabled={saving || regenerating}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {saving ? '저장 중...' : '저장'}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
