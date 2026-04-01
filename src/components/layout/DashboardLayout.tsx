import { useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Menu, Bell } from '../icons'

const pageTitles: Record<string, string> = {
  '/dashboard': '대시보드',
  '/dashboard/products': '상품 관리',
  '/dashboard/keywords': '키워드 인텔리전스',
  '/dashboard/orders': '주문 관리',
  '/dashboard/inventory': '재고 관리',
  '/dashboard/settlements': '정산',
  '/dashboard/content': '콘텐츠 허브',
}

export function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { pathname } = useLocation()

  const pageTitle = pageTitles[pathname] ?? '대시보드'

  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* 메인 콘텐츠 영역 */}
      <div className="lg:ml-64">
        {/* 상단 헤더 */}
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200 bg-white/95 px-4 backdrop-blur-sm lg:px-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(true)}
              className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden"
              aria-label="메뉴 열기"
            >
              <Menu className="h-5 w-5" />
            </button>
            <h1 className="text-lg font-semibold text-slate-900">{pageTitle}</h1>
          </div>

          <div className="flex items-center gap-3">
            <button
              className="relative rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors"
              aria-label="알림"
            >
              <Bell className="h-5 w-5" />
              <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-red-500" />
            </button>
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-sm font-semibold text-blue-600">
              S
            </div>
          </div>
        </header>

        {/* 페이지 콘텐츠 */}
        <main className="p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
