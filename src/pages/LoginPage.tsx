import { useState, type FormEvent } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { Logo } from '../components/common/Logo'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'

export function LoginPage() {
  const { login, loginDemo } = useAuth()
  const navigate = useNavigate()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      await login(email, password)
      navigate('/dashboard')
    } catch (err) {
      const msg = err instanceof Error ? err.message : '로그인 중 오류가 발생했습니다'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  function handleDemo() {
    loginDemo()
    navigate('/dashboard')
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 flex justify-center">
          <Logo height={44} />
        </div>

        <Card className="bg-white p-8">
          <h1 className="mb-6 text-center text-2xl font-bold text-slate-900">
            로그인
          </h1>

          {error && (
            <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="email"
                className="mb-1 block text-sm font-medium text-slate-700"
              >
                이메일
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seller@example.com"
                required
                autoComplete="email"
                className="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="mb-1 block text-sm font-medium text-slate-700"
              >
                비밀번호
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="비밀번호를 입력하세요"
                required
                autoComplete="current-password"
                className="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            <Button
              variant="primary"
              size="md"
              fullWidth
              className={loading ? 'opacity-50 cursor-not-allowed' : ''}
            >
              {loading ? '로그인 중...' : '로그인'}
            </Button>
          </form>

          <div className="mt-4">
            <Button
              variant="secondary"
              size="md"
              fullWidth
              onClick={handleDemo}
            >
              데모로 체험하기
            </Button>
          </div>

          <p className="mt-6 text-center text-sm text-slate-500">
            계정이 없으신가요?{' '}
            <Link
              to="/signup"
              className="font-medium text-blue-600 hover:text-blue-700 hover:underline"
            >
              회원가입
            </Link>
          </p>
        </Card>
      </div>
    </div>
  )
}
