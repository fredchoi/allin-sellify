import Link from 'next/link'

interface Props {
  searchParams: Promise<{
    paymentKey?: string
    orderId?: string
    amount?: string
    status?: string
  }>
}

export default async function CheckoutResultPage({ searchParams }: Props) {
  const { paymentKey, orderId, amount, status } = await searchParams

  const isSuccess = !status || status === 'DONE'

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-2xl border border-gray-100 p-8 text-center shadow-sm">
        {isSuccess ? (
          <>
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">결제 완료!</h1>
            <p className="text-gray-500 text-sm mb-6">주문이 성공적으로 접수되었습니다.</p>

            {amount && (
              <div className="bg-gray-50 rounded-xl p-4 mb-6 text-sm space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-500">결제 금액</span>
                  <span className="font-bold text-gray-900">{Number(amount).toLocaleString()}원</span>
                </div>
                {orderId && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">주문 번호</span>
                    <span className="font-mono text-xs text-gray-600 truncate max-w-[180px]">{orderId}</span>
                  </div>
                )}
                {paymentKey && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">결제 키</span>
                    <span className="font-mono text-xs text-gray-400 truncate max-w-[180px]">{paymentKey.slice(0, 20)}...</span>
                  </div>
                )}
              </div>
            )}
          </>
        ) : (
          <>
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">결제 실패</h1>
            <p className="text-gray-500 text-sm mb-6">결제가 처리되지 않았습니다. 다시 시도해 주세요.</p>
          </>
        )}

        <Link
          href="/"
          className="inline-block w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl transition-colors"
        >
          쇼핑 계속하기
        </Link>
      </div>
    </div>
  )
}
