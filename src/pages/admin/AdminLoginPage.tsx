import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAdminAuth } from '../../contexts/AdminAuthContext'
import { Card } from '../../components/ui/Card'

export function AdminLoginPage() {
  const { login, isAdminAuthenticated } = useAdminAuth()
  const navigate = useNavigate()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  if (isAdminAuthenticated) {
    navigate('/admin', { replace: true })
    return null
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      await login(email, password)
      navigate('/admin')
    } catch (err) {
      const msg = err instanceof Error ? err.message : '관리자 로그인 중 오류가 발생했습니다'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 flex flex-col items-center gap-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-purple-600">
            <span className="text-2xl font-bold text-white">S</span>
          </div>
          <h2 className="text-sm font-semibold text-purple-600">Sellify Admin</h2>
        </div>

        <Card className="bg-white p-8">
          <h1 className="mb-6 text-center text-2xl font-bold text-slate-900">
            관리자 로그인
          </h1>

          {error && (
            <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="admin-email"
                className="mb-1 block text-sm font-medium text-slate-700"
              >
                이메일
              </label>
              <input
                id="admin-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@sellify.kr"
                required
                autoComplete="email"
                className="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
              />
            </div>

            <div>
              <label
                htmlFor="admin-password"
                className="mb-1 block text-sm font-medium text-slate-700"
              >
                비밀번호
              </label>
              <input
                id="admin-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="비밀번호를 입력하세요"
                required
                autoComplete="current-password"
                className="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-purple-600 px-6 py-3 text-base font-semibold text-white transition-all duration-200 hover:bg-purple-700 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? '로그인 중...' : '관리자 로그인'}
            </button>
          </form>

          <p className="mt-6 text-center text-xs text-slate-400">
            admin@sellify.kr / admin1234
          </p>
        </Card>
      </div>
    </div>
  )
}
