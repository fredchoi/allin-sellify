import { type NextRequest, NextResponse } from 'next/server'

const BASE_DOMAIN = process.env['NEXT_PUBLIC_STORE_DOMAIN'] ?? 'sellify.kr'

export function proxy(request: NextRequest): NextResponse {
  const hostname = request.headers.get('host') ?? ''

  // 개발환경 localhost 패턴: store-a.localhost:3000
  const isLocal = hostname.includes('localhost') || hostname.includes('127.0.0.1')

  let subdomain: string | null = null

  if (isLocal) {
    // localhost:3000 → subdomain 없음 (기본 스토어)
    // demo.localhost:3000 → subdomain = 'demo'
    const parts = hostname.split('.')
    if (parts.length >= 2 && parts[0] !== 'localhost') {
      subdomain = parts[0]
    }
  } else {
    // seller-a.sellify.kr → subdomain = 'seller-a'
    const withoutPort = hostname.split(':')[0]
    if (withoutPort.endsWith(`.${BASE_DOMAIN}`)) {
      subdomain = withoutPort.slice(0, -(BASE_DOMAIN.length + 1))
    }
  }

  // 서브도메인을 헤더로 전달 (Server Component에서 headers()로 읽음)
  const requestHeaders = new Headers(request.headers)
  if (subdomain) {
    requestHeaders.set('x-store-subdomain', subdomain)
  }

  return NextResponse.next({ request: { headers: requestHeaders } })
}

export const config = {
  matcher: [
    // Next.js 내부 경로, 정적 파일 제외
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)).*)',
  ],
}
