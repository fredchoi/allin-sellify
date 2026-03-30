import { useState } from 'react'
import { Container } from '../ui/Container'
import { AnimateOnScroll } from '../ui/AnimateOnScroll'

type Plan = 'starter' | 'pro' | 'business'

const PLANS: { value: Plan; label: string; price: string }[] = [
  { value: 'starter', label: '스타터', price: '무료' },
  { value: 'pro', label: '프로', price: '₩29,400/월' },
  { value: 'business', label: '비즈니스', price: '₩89,400/월' },
]

export function SignupSection() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [plan, setPlan] = useState<Plan>('pro')
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setStatus('loading')
    setErrorMsg('')

    try {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), email: email.trim(), plan }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error ?? '신청 처리 중 오류가 발생했습니다.')
      }

      setStatus('success')
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : '네트워크 오류가 발생했습니다.')
      setStatus('error')
    }
  }

  return (
    <section id="signup" className="bg-gradient-to-b from-blue-50 to-white py-20 lg:py-28">
      <Container>
        <AnimateOnScroll>
          <div className="mx-auto max-w-xl">
            {status === 'success' ? (
              <div className="rounded-2xl bg-white p-8 shadow-lg text-center ring-1 ring-slate-200">
                <div className="text-5xl mb-4">🎉</div>
                <h3 className="text-2xl font-bold text-slate-900 mb-2">
                  얼리버드 신청 완료!
                </h3>
                <p className="text-slate-600 mb-6">
                  신청해 주셔서 감사합니다. 출시 시 이메일로 안내드리겠습니다.
                </p>
                <div className="rounded-xl bg-yellow-50 border border-yellow-200 p-4">
                  <p className="text-sm font-medium text-yellow-800">
                    📣 카카오톡 채널에서 출시 소식을 먼저 받아보세요!
                  </p>
                  <a
                    href="https://pf.kakao.com/_allinSellify"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 inline-block rounded-lg bg-yellow-400 hover:bg-yellow-500 text-yellow-900 font-semibold px-4 py-2 text-sm transition-colors"
                  >
                    카카오톡 채널 추가하기
                  </a>
                </div>
              </div>
            ) : (
              <>
                <div className="text-center mb-8">
                  <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-orange-50 px-4 py-1.5 text-sm font-medium text-orange-600 ring-1 ring-orange-200">
                    🔥 얼리버드 100명 한정 — 40% 할인
                  </div>
                  <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl">
                    지금 사전신청하고 할인가 확정하세요
                  </h2>
                  <p className="mt-2 text-slate-500">
                    출시 즉시 얼리버드 가격으로 사용할 수 있도록 자리를 확정해 드립니다.
                  </p>
                </div>

                <form
                  onSubmit={handleSubmit}
                  className="rounded-2xl bg-white p-8 shadow-lg ring-1 ring-slate-200 space-y-5"
                >
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-slate-700 mb-1">
                      이름 <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="name"
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="홍길동"
                      className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    />
                  </div>

                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1">
                      이메일 <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="email"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="hello@example.com"
                      className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      관심 플랜
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {PLANS.map((p) => (
                        <button
                          key={p.value}
                          type="button"
                          onClick={() => setPlan(p.value)}
                          className={`rounded-lg border-2 p-3 text-center transition-all ${
                            plan === p.value
                              ? 'border-blue-500 bg-blue-50 text-blue-700'
                              : 'border-slate-200 text-slate-600 hover:border-slate-300'
                          }`}
                        >
                          <div className="text-sm font-semibold">{p.label}</div>
                          <div className="text-xs mt-0.5 opacity-70">{p.price}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {status === 'error' && (
                    <p className="text-sm text-red-600 bg-red-50 rounded-lg px-4 py-2">
                      {errorMsg}
                    </p>
                  )}

                  <button
                    type="submit"
                    disabled={status === 'loading'}
                    className="w-full rounded-lg bg-orange-500 hover:bg-orange-600 disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold py-3 text-base transition-colors"
                  >
                    {status === 'loading' ? '처리 중...' : '얼리버드 사전신청하기 →'}
                  </button>

                  <p className="text-center text-xs text-slate-400">
                    🔒 개인정보는 안전하게 보호되며 마케팅 목적으로만 활용됩니다.
                  </p>
                </form>
              </>
            )}
          </div>
        </AnimateOnScroll>
      </Container>
    </section>
  )
}
