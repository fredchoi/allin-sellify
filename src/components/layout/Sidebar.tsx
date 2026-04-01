import { NavLink } from 'react-router-dom'
import { Logo } from '../common/Logo'
import { LogOut, Grid, Package, Search, ShoppingCart, Warehouse, Calculator, Pencil } from '../icons'
import { cn } from '../../lib/utils'

const menuItems = [
  { label: '홈', path: '/dashboard', icon: Grid },
  { label: '상품 관리', path: '/dashboard/products', icon: Package },
  { label: '키워드', path: '/dashboard/keywords', icon: Search },
  { label: '주문 관리', path: '/dashboard/orders', icon: ShoppingCart },
  { label: '재고 관리', path: '/dashboard/inventory', icon: Warehouse },
  { label: '정산', path: '/dashboard/settlements', icon: Calculator },
  { label: '콘텐츠', path: '/dashboard/content', icon: Pencil },
] as const

interface SidebarProps {
  open: boolean
  onClose: () => void
}

export function Sidebar({ open, onClose }: SidebarProps) {
  return (
    <>
      {/* 모바일 오버레이 */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/30 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={cn(
          'fixed left-0 top-0 z-50 flex h-full w-64 flex-col border-r border-slate-200 bg-white transition-transform duration-200',
          open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        {/* 로고 */}
        <div className="flex h-16 items-center px-6 border-b border-slate-100">
          <NavLink to="/dashboard" onClick={onClose}>
            <Logo height={28} />
          </NavLink>
        </div>

        {/* 메뉴 */}
        <nav className="flex-1 overflow-y-auto px-3 py-4">
          <ul className="space-y-1">
            {menuItems.map(({ label, path, icon: Icon }) => (
              <li key={path}>
                <NavLink
                  to={path}
                  end={path === '/dashboard'}
                  onClick={onClose}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-blue-600 text-white'
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
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
        <div className="border-t border-slate-100 px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-sm font-semibold text-blue-600">
              S
            </div>
            <div className="flex-1 min-w-0">
              <p className="truncate text-sm font-medium text-slate-900">셀러</p>
              <p className="truncate text-xs text-slate-500">seller@example.com</p>
            </div>
            <button
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
              aria-label="로그아웃"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>
    </>
  )
}
