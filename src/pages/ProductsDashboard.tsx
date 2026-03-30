import { useState, useEffect } from 'react'
import {
  useCollectProducts,
  useWholesaleProducts,
  useProcessedProducts,
  useProcessProduct,
  type WholesaleProduct,
  type ProcessedProduct,
} from '../hooks/useProductsApi'

// ── 상태 뱃지 ────────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; className: string }> = {
    available: { label: '재고있음', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    soldout: { label: '품절', className: 'bg-red-50 text-red-600 border-red-200' },
    discontinued: { label: '단종', className: 'bg-slate-100 text-slate-500 border-slate-200' },
    pending: { label: '대기중', className: 'bg-slate-100 text-slate-500 border-slate-200' },
    title_done: { label: '제목완료', className: 'bg-blue-50 text-blue-600 border-blue-200' },
    image_done: { label: '이미지완료', className: 'bg-indigo-50 text-indigo-600 border-indigo-200' },
    completed: { label: '가공완료', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    failed: { label: '실패', className: 'bg-red-50 text-red-600 border-red-200' },
  }
  const s = map[status] ?? { label: status, className: 'bg-slate-100 text-slate-500 border-slate-200' }
  return (
    <span className={`inline-flex items-center text-xs px-1.5 py-0.5 rounded border font-medium ${s.className}`}>
      {s.label}
    </span>
  )
}

// ── 가공 진행률 바 ────────────────────────────────────────────────────────────

const STEPS = ['pending', 'title_done', 'image_done', 'option_done', 'completed']
function ProgressBar({ status }: { status: string }) {
  const idx = STEPS.indexOf(status)
  const pct = status === 'failed' ? 0 : Math.round(((idx < 0 ? 0 : idx) / (STEPS.length - 1)) * 100)
  const color = status === 'failed' ? 'bg-red-400' : status === 'completed' ? 'bg-emerald-500' : 'bg-blue-500'
  return (
    <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
      <div className={`h-full rounded-full transition-all duration-500 ${color}`} style={{ width: `${pct}%` }} />
    </div>
  )
}

// ── 도매 상품 카드 ────────────────────────────────────────────────────────────

function WholesaleCard({
  product,
  onProcess,
  processing,
}: {
  product: WholesaleProduct
  onProcess: (id: string) => void
  processing: boolean
}) {
  const images = Array.isArray(product.images) ? product.images : []
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 flex gap-4 hover:shadow-sm transition-shadow">
      <div className="w-16 h-16 flex-shrink-0 rounded-lg overflow-hidden bg-slate-100">
        {images[0] ? (
          <img src={images[0]} alt={product.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-slate-300 text-xs">없음</div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-800 truncate">{product.name}</p>
        <p className="text-xs text-slate-400 mt-0.5">{product.category ?? '미분류'} · {product.source}</p>
        <div className="flex items-center gap-2 mt-1.5">
          <span className="text-sm font-semibold text-slate-700">
            {product.price.toLocaleString()}원
          </span>
          <StatusBadge status={product.supply_status} />
        </div>
      </div>
      <div className="flex-shrink-0 flex items-center">
        <button
          onClick={() => onProcess(product.id)}
          disabled={processing || product.supply_status !== 'available'}
          className="text-xs px-3 py-1.5 bg-blue-600 text-white rounded-lg font-medium
                     hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          AI 가공
        </button>
      </div>
    </div>
  )
}

// ── 가공 상품 카드 ────────────────────────────────────────────────────────────

function ProcessedCard({
  product,
  onSelect,
  selected,
}: {
  product: ProcessedProduct
  onSelect: (p: ProcessedProduct) => void
  selected: boolean
}) {
  const images = Array.isArray(product.wholesale_images) ? product.wholesale_images : []
  return (
    <button
      onClick={() => onSelect(product)}
      className={`w-full text-left bg-white border rounded-xl p-4 flex gap-4 transition-all
        ${selected ? 'border-blue-500 shadow-md shadow-blue-50' : 'border-slate-200 hover:shadow-sm'}`}
    >
      <div className="w-14 h-14 flex-shrink-0 rounded-lg overflow-hidden bg-slate-100">
        {images[0] ? (
          <img src={images[0] as string} alt={product.wholesale_name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-slate-300 text-xs">없음</div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-slate-800 truncate">
          {product.title ?? product.wholesale_name ?? '–'}
        </p>
        {product.hooking_text && (
          <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{product.hooking_text}</p>
        )}
        <div className="mt-2 space-y-1">
          <ProgressBar status={product.processing_status} />
          <div className="flex items-center justify-between">
            <StatusBadge status={product.processing_status} />
            {product.selling_price && (
              <span className="text-xs font-medium text-slate-600">
                {product.selling_price.toLocaleString()}원
              </span>
            )}
          </div>
        </div>
      </div>
    </button>
  )
}

// ── 상세 패널 ────────────────────────────────────────────────────────────────

function DetailPanel({ product, onClose }: { product: ProcessedProduct; onClose: () => void }) {
  const images = Array.isArray(product.wholesale_images) ? product.wholesale_images : []
  const options = Array.isArray(product.processed_options)
    ? (product.processed_options as Array<{ name: string; values: string[] }>)
    : (product.wholesale_options ?? [])

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
        <span className="text-sm font-semibold text-slate-800">가공 결과 미리보기</span>
        <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors p-1">
          <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
            <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22z" />
          </svg>
        </button>
      </div>

      <div className="p-4 space-y-4 overflow-y-auto max-h-[calc(100vh-16rem)]">
        {/* 상품 이미지 */}
        {images[0] && (
          <img
            src={images[0] as string}
            alt={product.wholesale_name}
            className="w-full aspect-square object-cover rounded-lg bg-slate-100"
          />
        )}

        {/* 제목 & 후킹 */}
        <div>
          <p className="text-xs font-medium text-slate-400 mb-1">AI 생성 제목</p>
          <p className="text-sm font-semibold text-slate-800">
            {product.title ?? <span className="text-slate-300 italic">생성 중...</span>}
          </p>
        </div>

        {product.hooking_text && (
          <div>
            <p className="text-xs font-medium text-slate-400 mb-1">후킹 문구</p>
            <p className="text-sm text-slate-600 whitespace-pre-line">{product.hooking_text}</p>
          </div>
        )}

        {/* 가격 정보 */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-slate-50 rounded-lg p-3">
            <p className="text-xs text-slate-400">도매가</p>
            <p className="text-sm font-bold text-slate-700">
              {product.wholesale_price?.toLocaleString() ?? '–'}원
            </p>
          </div>
          <div className="bg-blue-50 rounded-lg p-3">
            <p className="text-xs text-blue-500">판매가</p>
            <p className="text-sm font-bold text-blue-700">
              {product.selling_price?.toLocaleString() ?? '–'}원
            </p>
          </div>
        </div>

        {/* 옵션 */}
        {options.length > 0 && (
          <div>
            <p className="text-xs font-medium text-slate-400 mb-2">옵션</p>
            <div className="space-y-2">
              {options.map((opt) => (
                <div key={opt.name}>
                  <p className="text-xs text-slate-500 mb-1">{opt.name}</p>
                  <div className="flex flex-wrap gap-1">
                    {opt.values.map((v) => (
                      <span
                        key={v}
                        className="text-xs px-2 py-0.5 bg-slate-100 text-slate-600 rounded border border-slate-200"
                      >
                        {v}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 처리 체크포인트 */}
        <div>
          <p className="text-xs font-medium text-slate-400 mb-2">처리 현황</p>
          <div className="space-y-1.5">
            {['title', 'image', 'option'].map((step) => {
              const cp = (product.processing_checkpoints as Record<string, { done: boolean }>) ?? {}
              const done = cp[step]?.done
              return (
                <div key={step} className="flex items-center gap-2 text-xs">
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      done === true ? 'bg-emerald-500' : done === false ? 'bg-red-400' : 'bg-slate-200'
                    }`}
                  />
                  <span className="text-slate-500 capitalize">{step}</span>
                  <span className={done === true ? 'text-emerald-600' : done === false ? 'text-red-500' : 'text-slate-300'}>
                    {done === true ? '완료' : done === false ? '실패' : '대기'}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── 메인 대시보드 ─────────────────────────────────────────────────────────────

export function ProductsDashboard() {
  const [tab, setTab] = useState<'wholesale' | 'processed'>('wholesale')
  const [selectedProduct, setSelectedProduct] = useState<ProcessedProduct | null>(null)
  const [collectKeyword, setCollectKeyword] = useState('')
  const [collectMessage, setCollectMessage] = useState<string | null>(null)
  const [processingId, setProcessingId] = useState<string | null>(null)
  const [wholesalePage, setWholesalePage] = useState(1)
  const [processedPage, setProcessedPage] = useState(1)

  const { collect, loading: collectLoading } = useCollectProducts()
  const { products: wholesale, total: wholesaleTotal, loading: wholesaleLoading, load: loadWholesale } =
    useWholesaleProducts()
  const { products: processed, total: processedTotal, loading: processedLoading, load: loadProcessed } =
    useProcessedProducts()
  const { process } = useProcessProduct()

  useEffect(() => {
    loadWholesale({ page: wholesalePage })
  }, [loadWholesale, wholesalePage])

  useEffect(() => {
    if (tab === 'processed') {
      loadProcessed({ page: processedPage })
    }
  }, [tab, loadProcessed, processedPage])

  async function handleCollect() {
    try {
      const result = await collect({ keyword: collectKeyword || undefined, source: 'mock' })
      setCollectMessage(`${result.collected}개 수집 완료 (건너뜀 ${result.skipped}개)`)
      loadWholesale({ page: 1 })
      setWholesalePage(1)
    } catch {
      setCollectMessage('수집 실패')
    }
    setTimeout(() => setCollectMessage(null), 3000)
  }

  async function handleProcess(wholesaleProductId: string) {
    setProcessingId(wholesaleProductId)
    try {
      await process(wholesaleProductId)
      setTab('processed')
      loadProcessed({ page: 1 })
    } finally {
      setProcessingId(null)
    }
  }

  const PAGE_SIZE = 10

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* 헤더 */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-screen-xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <a href="/" className="text-slate-400 hover:text-slate-600 transition-colors" title="홈">
              <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M9.293 2.293a1 1 0 0 1 1.414 0l7 7A1 1 0 0 1 17 11h-1v6a1 1 0 0 1-1 1h-2a1 1 0 0 1-1-1v-3a1 1 0 0 0-1-1H9a1 1 0 0 0-1 1v3a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-6H3a1 1 0 0 1-.707-1.707l7-7z" clipRule="evenodd" />
              </svg>
            </a>
            <div className="h-5 w-px bg-slate-200" />
            <div>
              <span className="text-sm font-semibold text-slate-800">상품 수집 & AI 가공</span>
              <span className="hidden sm:inline text-xs text-slate-400 ml-2">Module 02</span>
            </div>
          </div>
          <span className="inline-flex items-center gap-1 text-xs bg-amber-50 text-amber-600 border border-amber-200 px-2 py-1 rounded-full font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block" />
            MVP
          </span>
        </div>
      </header>

      <main className="flex-1 max-w-screen-xl mx-auto w-full px-4 sm:px-6 py-6">
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-6 items-start">
          {/* 왼쪽 */}
          <div className="flex flex-col gap-5">
            {/* 수집 컨트롤 */}
            <div className="bg-white border border-slate-200 rounded-xl p-4">
              <p className="text-sm font-semibold text-slate-800 mb-3">도매 상품 수집</p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={collectKeyword}
                  onChange={(e) => setCollectKeyword(e.target.value)}
                  placeholder="키워드 검색 (비우면 전체)"
                  className="flex-1 text-sm border border-slate-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-300"
                  onKeyDown={(e) => e.key === 'Enter' && handleCollect()}
                />
                <button
                  onClick={handleCollect}
                  disabled={collectLoading}
                  className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg
                             hover:bg-blue-700 disabled:opacity-50 transition-colors whitespace-nowrap"
                >
                  {collectLoading ? '수집 중...' : '수집 시작'}
                </button>
              </div>
              {collectMessage && (
                <p className="text-xs text-emerald-600 mt-2 font-medium">{collectMessage}</p>
              )}
            </div>

            {/* 탭 */}
            <div className="flex gap-1 bg-slate-100 p-1 rounded-xl">
              {(['wholesale', 'processed'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all
                    ${tab === t ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  {t === 'wholesale'
                    ? `도매 상품 ${wholesaleTotal > 0 ? `(${wholesaleTotal})` : ''}`
                    : `가공 상품 ${processedTotal > 0 ? `(${processedTotal})` : ''}`}
                </button>
              ))}
            </div>

            {/* 도매 상품 탭 */}
            {tab === 'wholesale' && (
              <div className="space-y-2">
                {wholesaleLoading ? (
                  <div className="text-center py-12 text-slate-400 text-sm">로딩 중...</div>
                ) : wholesale.length === 0 ? (
                  <div className="text-center py-12 text-slate-400 text-sm">
                    <p>도매 상품이 없습니다.</p>
                    <p className="text-xs mt-1">위에서 '수집 시작'을 눌러 상품을 가져오세요.</p>
                  </div>
                ) : (
                  wholesale.map((p) => (
                    <WholesaleCard
                      key={p.id}
                      product={p}
                      onProcess={handleProcess}
                      processing={processingId === p.id}
                    />
                  ))
                )}

                {/* 페이지네이션 */}
                {wholesaleTotal > PAGE_SIZE && (
                  <div className="flex justify-center gap-2 pt-2">
                    <button
                      onClick={() => setWholesalePage((p) => Math.max(1, p - 1))}
                      disabled={wholesalePage === 1}
                      className="text-xs px-3 py-1.5 border border-slate-200 rounded-lg disabled:opacity-40"
                    >
                      이전
                    </button>
                    <span className="text-xs text-slate-500 px-2 py-1.5">
                      {wholesalePage} / {Math.ceil(wholesaleTotal / PAGE_SIZE)}
                    </span>
                    <button
                      onClick={() => setWholesalePage((p) => p + 1)}
                      disabled={wholesalePage * PAGE_SIZE >= wholesaleTotal}
                      className="text-xs px-3 py-1.5 border border-slate-200 rounded-lg disabled:opacity-40"
                    >
                      다음
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* 가공 상품 탭 */}
            {tab === 'processed' && (
              <div className="space-y-2">
                {processedLoading ? (
                  <div className="text-center py-12 text-slate-400 text-sm">로딩 중...</div>
                ) : processed.length === 0 ? (
                  <div className="text-center py-12 text-slate-400 text-sm">
                    <p>가공된 상품이 없습니다.</p>
                    <p className="text-xs mt-1">도매 상품에서 'AI 가공' 버튼을 눌러보세요.</p>
                  </div>
                ) : (
                  processed.map((p) => (
                    <ProcessedCard
                      key={p.id}
                      product={p}
                      onSelect={setSelectedProduct}
                      selected={selectedProduct?.id === p.id}
                    />
                  ))
                )}

                {processedTotal > PAGE_SIZE && (
                  <div className="flex justify-center gap-2 pt-2">
                    <button
                      onClick={() => setProcessedPage((p) => Math.max(1, p - 1))}
                      disabled={processedPage === 1}
                      className="text-xs px-3 py-1.5 border border-slate-200 rounded-lg disabled:opacity-40"
                    >
                      이전
                    </button>
                    <span className="text-xs text-slate-500 px-2 py-1.5">
                      {processedPage} / {Math.ceil(processedTotal / PAGE_SIZE)}
                    </span>
                    <button
                      onClick={() => setProcessedPage((p) => p + 1)}
                      disabled={processedPage * PAGE_SIZE >= processedTotal}
                      className="text-xs px-3 py-1.5 border border-slate-200 rounded-lg disabled:opacity-40"
                    >
                      다음
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 오른쪽: 상세 패널 */}
          <div className="xl:sticky xl:top-[calc(3.5rem+1.5rem)]">
            {selectedProduct ? (
              <DetailPanel
                product={selectedProduct}
                onClose={() => setSelectedProduct(null)}
              />
            ) : (
              <div className="bg-white border border-slate-100 rounded-xl p-8 text-center text-slate-300">
                <svg className="w-10 h-10 mx-auto mb-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 1 0-7.5 0v4.5m11.356-1.993 1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 0 1-1.12-1.243l1.264-12A1.125 1.125 0 0 1 5.513 7.5h12.974c.576 0 1.059.435 1.119 1.007Z" />
                </svg>
                <p className="text-sm">가공 상품을 선택하면<br />미리보기가 표시됩니다</p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
