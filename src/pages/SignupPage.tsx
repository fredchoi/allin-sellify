import { useState, type FormEvent } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { Logo } from '../components/common/Logo'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'

interface FormErrors {
  name?: string
  email?: string
  password?: string
  confirmPassword?: string
}

function validateForm(
  name: string,
  email: string,
  password: string,
  confirmPassword: string
): FormErrors {
  const errors: FormErrors = {}

  if (name.trim().length < 2) {
    errors.name = '이름은 2자 이상 입력해주세요'
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email)) {
    errors.email = '올바른 이메일 형식을 입력해주세요'
  }

  if (password.length < 8) {
    errors.password = '비밀번호는 8자 이상이어야 합니다'
  }

  if (password !== confirmPassword) {
    errors.confirmPassword = '비밀번호가 일치하지 않습니다'
  }

  return errors
}

function hasErrors(errors: FormErrors): boolean {
  return Object.keys(errors).length > 0
}

export function SignupPage() {
  const { signup } = useAuth()
  const navigate = useNavigate()

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [formErrors, setFormErrors] = useState<FormErrors>({})
  const [serverError, setServerError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setServerError(null)

    const errors = validateForm(name, email, password, confirmPassword)
    setFormErrors(errors)

    if (hasErrors(errors)) {
      return
    }

    setLoading(true)

    try {
      await signup(name.trim(), email.trim(), password)
      navigate('/dashboard')
    } catch (err) {
      const msg = err instanceof Error ? err.message : '회원가입 중 오류가 발생했습니다'
      setServerError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 flex justify-center">
          <Logo height={44} />
        </div>

        <Card className="bg-white p-8">
          <h1 className="mb-6 text-center text-2xl font-bold text-slate-900">
            회원가입
          </h1>

          {serverError && (
            <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">
              {serverError}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="name"
                className="mb-1 block text-sm font-medium text-slate-700"
              >
                이름 (상호명)
              </label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="홍길동 / 셀러스토어"
                required
                autoComplete="name"
                className="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
              {formErrors.name && (
                <p className="mt-1 text-xs text-red-500">{formErrors.name}</p>
              )}
            </div>

            <div>
              <label
                htmlFor="signup-email"
                className="mb-1 block text-sm font-medium text-slate-700"
              >
                이메일
              </label>
              <input
                id="signup-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seller@example.com"
                required
                autoComplete="email"
                className="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
              {formErrors.email && (
                <p className="mt-1 text-xs text-red-500">{formErrors.email}</p>
              )}
            </div>

            <div>
              <label
                htmlFor="signup-password"
                className="mb-1 block text-sm font-medium text-slate-700"
              >
                비밀번호
              </label>
              <input
                id="signup-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="8자 이상 입력하세요"
                required
                autoComplete="new-password"
                className="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
              {formErrors.password && (
                <p className="mt-1 text-xs text-red-500">{formErrors.password}</p>
              )}
            </div>

            <div>
              <label
                htmlFor="confirm-password"
                className="mb-1 block text-sm font-medium text-slate-700"
              >
                비밀번호 확인
              </label>
              <input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="비밀번호를 다시 입력하세요"
                required
                autoComplete="new-password"
                className="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
              {formErrors.confirmPassword && (
                <p className="mt-1 text-xs text-red-500">{formErrors.confirmPassword}</p>
              )}
            </div>

            <Button
              variant="primary"
              size="md"
              fullWidth
              className={loading ? 'opacity-50 cursor-not-allowed' : ''}
            >
              {loading ? '가입 처리 중...' : '회원가입'}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-500">
            이미 계정이 있으신가요?{' '}
            <Link
              to="/login"
              className="font-medium text-blue-600 hover:text-blue-700 hover:underline"
            >
              로그인
            </Link>
          </p>
        </Card>
      </div>
    </div>
  )
}
