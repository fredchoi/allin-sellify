import { useState } from 'react'
import { NavLink, Outlet, Navigate, useLocation } from 'react-router-dom'
import { useAdminAuth } from '../../contexts/AdminAuthContext'
import { Menu, Grid, LogOut } from '../icons'
import { cn } from '../../lib/utils'

const pageTitles: Record<string, string> = {
  '/admin': '관리자 대시보드',
  '/admin/sellers': '셀러 관리',
  '/admin/jobs': '잡 모니터링',
}

const menuItems = [
  { label: '대시보드', path: '/admin', icon: Grid },
  { label: '셀러 관리', path: '/admin/sellers', icon: UsersIcon },
  { label: '잡 모니터링', path: '/admin/jobs', icon: ActivityIcon },
] as const

function UsersIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 00-3-3.87" />
      <path d="M16 3.13a4 4 0 010 7.75" />
    </svg>
  )
}

function ActivityIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
    </svg>
  )
}

export function AdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { pathname } = useLocation()
  const { isAdminAuthenticated, adminUser, logout } = useAdminAuth()

  if (!isAdminAuthenticated) {
    return <Navigate to="/admin/login" replace />
  }

  const pageTitle = pageTitles[pathname] ?? '관리자'

  return (
    <div className="min-h-screen bg-slate-50">
      {/* 모바일 오버레이 */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* 사이드바 */}
      <aside
        className={cn(
          'fixed left-0 top-0 z-50 flex h-full w-64 flex-col bg-purple-700 transition-transform duration-200',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        {/* 로고 영역 */}
        <div className="flex h-16 items-center gap-3 px-6 border-b border-purple-600">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/20">
            <span className="text-sm font-bold text-white">S</span>
          </div>
          <span className="text-lg font-bold text-white">Sellify Admin</span>
        </div>

        {/* 메뉴 */}
        <nav className="flex-1 overflow-y-auto px-3 py-4">
          <ul className="space-y-1">
            {menuItems.map(({ label, path, icon: Icon }) => (
              <li key={path}>
                <NavLink
                  to={path}
                  end={path === '/admin'}
                  onClick={() => setSidebarOpen(false)}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-white/20 text-white'
                        : 'text-purple-200 hover:bg-white/10 hover:text-white'
                    )
                  }
                >
                  <Icon className="h-5 w-5 shrink-0" />
                  <span>{label}</span>
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        {/* 하단 사용자 정보 */}
        <div className="border-t border-purple-600 px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-sm font-semibold text-white">
              A
            </div>
            <div className="flex-1 min-w-0">
              <p className="truncate text-sm font-medium text-white">
                {adminUser?.name ?? '관리자'}
              </p>
              <p className="truncate text-xs text-purple-300">
                {adminUser?.email ?? ''}
              </p>
            </div>
            <button
              onClick={logout}
              className="rounded-lg p-1.5 text-purple-300 hover:bg-white/10 hover:text-white transition-colors"
              aria-label="로그아웃"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

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
            <span className="inline-flex items-center rounded-full bg-purple-100 px-2.5 py-0.5 text-xs font-semibold text-purple-700">
              관리자
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-purple-100 text-sm font-semibold text-purple-600">
              A
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
