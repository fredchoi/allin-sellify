import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, CheckCircle } from '../icons'
import { useCreateListing, type ProcessedProduct } from '../../hooks/useProductsApi'

interface ListingPublishModalProps {
  product: ProcessedProduct
  onClose: () => void
  onPublished: () => void
}

export function ListingPublishModal({ product, onClose, onPublished }: ListingPublishModalProps) {
  const [listingPrice, setListingPrice] = useState(product.selling_price ?? 0)
  const [marketplace] = useState<'naver'>('naver')
  const [publishedUrl, setPublishedUrl] = useState<string | null>(null)
  const { create, loading, error } = useCreateListing()

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

  async function handlePublish() {
    const result = await create({
      processedProductId: product.id,
      marketplace,
      listingPrice,
    })
    if (result) {
      setPublishedUrl(result.marketUrl ?? null)
      onPublished()
    }
  }

  const images = Array.isArray(product.wholesale_images) ? product.wholesale_images : []
  const isSuccess = publishedUrl !== null

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
          className="relative bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
            <h2 className="text-base font-semibold text-slate-800">마켓 등록</h2>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 transition-colors p-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div className="p-6 space-y-5">
            {isSuccess ? (
              /* Success state */
              <div className="text-center py-6">
                <div className="w-16 h-16 mx-auto mb-4 bg-green-50 rounded-full flex items-center justify-center">
                  <CheckCircle className="w-8 h-8 text-green-500" />
                </div>
                <p className="text-lg font-semibold text-slate-800 mb-1">등록 완료</p>
                <p className="text-sm text-slate-500 mb-4">마켓에 상품이 성공적으로 등록되었습니다</p>
                {publishedUrl && publishedUrl !== '' && (
                  <a
                    href={publishedUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 font-medium"
                  >
                    마켓 상품 페이지 열기
                    <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M4.25 5.5a.75.75 0 0 0-.75.75v8.5c0 .414.336.75.75.75h8.5a.75.75 0 0 0 .75-.75v-4a.75.75 0 0 1 1.5 0v4A2.25 2.25 0 0 1 12.75 17h-8.5A2.25 2.25 0 0 1 2 14.75v-8.5A2.25 2.25 0 0 1 4.25 4h5a.75.75 0 0 1 0 1.5h-5zm7.5-1.75a.75.75 0 0 0 0 1.5h2.69l-5.72 5.72a.75.75 0 1 0 1.06 1.06l5.72-5.72v2.69a.75.75 0 0 0 1.5 0v-5.25h-5.25z" clipRule="evenodd" />
                    </svg>
                  </a>
                )}
              </div>
            ) : (
              /* Form state */
              <>
                {/* Product preview */}
                <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                  <div className="w-12 h-12 rounded-lg overflow-hidden bg-slate-200 flex-shrink-0">
                    {images[0] ? (
                      <img src={images[0] as string} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-300 text-xs">없음</div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-slate-800 truncate">
                      {product.title ?? product.wholesale_name ?? '-'}
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      도매가 {product.wholesale_price?.toLocaleString() ?? 0}원
                    </p>
                  </div>
                </div>

                {/* Marketplace selector */}
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-2">판매 채널</label>
                  <div className="flex items-center gap-3 p-3 border border-blue-200 bg-blue-50/50 rounded-lg">
                    <input
                      type="checkbox"
                      checked
                      readOnly
                      className="w-4 h-4 text-blue-600 rounded border-slate-300"
                    />
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 bg-green-500 rounded flex items-center justify-center">
                        <span className="text-white text-xs font-bold">N</span>
                      </div>
                      <span className="text-sm font-medium text-slate-700">네이버 스마트스토어</span>
                    </div>
                    <span className="ml-auto text-xs text-blue-500 font-medium">MVP</span>
                  </div>
                </div>

                {/* Listing price */}
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">등록가</label>
                  <div className="relative">
                    <input
                      type="number"
                      value={listingPrice}
                      onChange={(e) => setListingPrice(Number(e.target.value))}
                      min={0}
                      className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 pr-8 outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-300"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">원</span>
                  </div>
                </div>

                {/* Error */}
                {error && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center justify-between">
                    <p className="text-sm text-red-600">{error}</p>
                    <button
                      onClick={handlePublish}
                      className="text-xs text-red-600 font-medium hover:text-red-700 ml-3 whitespace-nowrap"
                    >
                      재시도
                    </button>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-slate-100 bg-slate-50/50">
            {isSuccess ? (
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
              >
                닫기
              </button>
            ) : (
              <>
                <button
                  onClick={onClose}
                  disabled={loading}
                  className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 rounded-lg hover:bg-slate-100 transition-colors disabled:opacity-50"
                >
                  취소
                </button>
                <button
                  onClick={handlePublish}
                  disabled={loading || listingPrice <= 0}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {loading && (
                    <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                  )}
                  {loading ? '등록 중...' : '등록하기'}
                </button>
              </>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
