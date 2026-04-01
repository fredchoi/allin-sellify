import { createContext, useState, useEffect, useCallback, type ReactNode } from 'react'

interface Seller {
  id: string
  email: string
  name: string
  plan: string
}

export interface AuthState {
  token: string | null
  seller: Seller | null
  isAuthenticated: boolean
  isDemo: boolean
}

interface AuthContextValue extends AuthState {
  login: (email: string, password: string) => Promise<void>
  signup: (name: string, email: string, password: string) => Promise<void>
  loginDemo: () => void
  logout: () => Promise<void>
  getToken: () => string | null
}

const STORAGE_KEY_TOKEN = 'sellify_token'
const STORAGE_KEY_SELLER = 'sellify_seller'
const STORAGE_KEY_DEMO = 'sellify_demo'

const DEMO_SELLER: Seller = {
  id: 'demo-00000000-0000-0000-0000-000000000000',
  email: 'demo@sellify.kr',
  name: '데모 셀러',
  plan: 'free',
}

const initialState: AuthContextValue = {
  token: null,
  seller: null,
  isAuthenticated: false,
  isDemo: false,
  login: async () => {},
  signup: async () => {},
  loginDemo: () => {},
  logout: async () => {},
  getToken: () => null,
}

export const AuthContext = createContext<AuthContextValue>(initialState)

function readStoredAuth(): AuthState {
  try {
    const token = localStorage.getItem(STORAGE_KEY_TOKEN)
    const sellerJson = localStorage.getItem(STORAGE_KEY_SELLER)
    const isDemo = localStorage.getItem(STORAGE_KEY_DEMO) === 'true'

    if (isDemo) {
      return { token: null, seller: DEMO_SELLER, isAuthenticated: true, isDemo: true }
    }

    if (token && sellerJson) {
      const seller = JSON.parse(sellerJson) as Seller
      return { token, seller, isAuthenticated: true, isDemo: false }
    }
  } catch {
    // 손상된 localStorage 데이터 무시
  }

  return { token: null, seller: null, isAuthenticated: false, isDemo: false }
}

function clearStorage() {
  localStorage.removeItem(STORAGE_KEY_TOKEN)
  localStorage.removeItem(STORAGE_KEY_SELLER)
  localStorage.removeItem(STORAGE_KEY_DEMO)
}

interface AuthProviderProps {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [state, setState] = useState<AuthState>(() => readStoredAuth())

  useEffect(() => {
    setState(readStoredAuth())
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    const res = await fetch('/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.message ?? `로그인 실패 (${res.status})`)
    }

    const data = await res.json()
    const { token, seller } = data as { token: string; seller: Seller }

    localStorage.setItem(STORAGE_KEY_TOKEN, token)
    localStorage.setItem(STORAGE_KEY_SELLER, JSON.stringify(seller))
    localStorage.removeItem(STORAGE_KEY_DEMO)

    setState({ token, seller, isAuthenticated: true, isDemo: false })
  }, [])

  const signup = useCallback(async (name: string, email: string, password: string) => {
    const res = await fetch('/api/v1/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password }),
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.message ?? `회원가입 실패 (${res.status})`)
    }

    const data = await res.json()
    const { token, seller } = data as { token: string; seller: Seller }

    localStorage.setItem(STORAGE_KEY_TOKEN, token)
    localStorage.setItem(STORAGE_KEY_SELLER, JSON.stringify(seller))
    localStorage.removeItem(STORAGE_KEY_DEMO)

    setState({ token, seller, isAuthenticated: true, isDemo: false })
  }, [])

  const loginDemo = useCallback(() => {
    clearStorage()
    localStorage.setItem(STORAGE_KEY_DEMO, 'true')

    setState({ token: null, seller: DEMO_SELLER, isAuthenticated: true, isDemo: true })
  }, [])

  const logout = useCallback(async () => {
    try {
      if (state.token) {
        await fetch('/api/v1/auth/logout', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${state.token}`,
          },
        })
      }
    } catch {
      // 로그아웃 API 실패해도 로컬 상태는 초기화
    }

    clearStorage()
    setState({ token: null, seller: null, isAuthenticated: false, isDemo: false })
  }, [state.token])

  const getToken = useCallback(() => state.token, [state.token])

  const value: AuthContextValue = {
    ...state,
    login,
    signup,
    loginDemo,
    logout,
    getToken,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
