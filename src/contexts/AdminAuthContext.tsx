import { createContext, useState, useEffect, useCallback, useContext, type ReactNode } from 'react'

interface AdminUser {
  id: string
  email: string
  name: string
  role: string
}

interface AdminAuthState {
  token: string | null
  adminUser: AdminUser | null
  isAdminAuthenticated: boolean
}

interface AdminAuthContextValue extends AdminAuthState {
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  getAdminToken: () => string | null
}

const ADMIN_TOKEN_KEY = 'admin_token'
const ADMIN_USER_KEY = 'admin_user'

const initialState: AdminAuthContextValue = {
  token: null,
  adminUser: null,
  isAdminAuthenticated: false,
  login: async () => {},
  logout: () => {},
  getAdminToken: () => null,
}

export const AdminAuthContext = createContext<AdminAuthContextValue>(initialState)

function readStoredAdminAuth(): AdminAuthState {
  try {
    const token = localStorage.getItem(ADMIN_TOKEN_KEY)
    const userJson = localStorage.getItem(ADMIN_USER_KEY)

    if (token && userJson) {
      const adminUser = JSON.parse(userJson) as AdminUser
      return { token, adminUser, isAdminAuthenticated: true }
    }
  } catch {
    // 손상된 localStorage 데이터 무시
  }

  return { token: null, adminUser: null, isAdminAuthenticated: false }
}

function clearAdminStorage() {
  localStorage.removeItem(ADMIN_TOKEN_KEY)
  localStorage.removeItem(ADMIN_USER_KEY)
}

interface AdminAuthProviderProps {
  children: ReactNode
}

export function AdminAuthProvider({ children }: AdminAuthProviderProps) {
  const [state, setState] = useState<AdminAuthState>(() => readStoredAdminAuth())

  useEffect(() => {
    setState(readStoredAdminAuth())
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    const res = await fetch('/api/v1/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.message ?? `관리자 로그인 실패 (${res.status})`)
    }

    const data = await res.json()
    const { token, user } = data as { token: string; user: AdminUser }

    localStorage.setItem(ADMIN_TOKEN_KEY, token)
    localStorage.setItem(ADMIN_USER_KEY, JSON.stringify(user))

    setState({ token, adminUser: user, isAdminAuthenticated: true })
  }, [])

  const logout = useCallback(() => {
    clearAdminStorage()
    setState({ token: null, adminUser: null, isAdminAuthenticated: false })
  }, [])

  const getAdminToken = useCallback(() => state.token, [state.token])

  const value: AdminAuthContextValue = {
    ...state,
    login,
    logout,
    getAdminToken,
  }

  return <AdminAuthContext.Provider value={value}>{children}</AdminAuthContext.Provider>
}

export function useAdminAuth() {
  const context = useContext(AdminAuthContext)

  if (!context) {
    throw new Error('useAdminAuth는 AdminAuthProvider 내부에서만 사용할 수 있습니다')
  }

  return context
}
