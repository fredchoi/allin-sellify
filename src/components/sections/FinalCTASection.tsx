import { useState, useEffect } from 'react'
import { Container } from '../ui/Container'
import { Button } from '../ui/Button'
import { AnimateOnScroll } from '../ui/AnimateOnScroll'

// Early bird deadline: 30 days from launch
const DEADLINE = new Date('2026-04-28T23:59:59+09:00').getTime()

function useCountdown(target: number) {
  const [timeLeft, setTimeLeft] = useState(() => Math.max(0, target - Date.now()))

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(Math.max(0, target - Date.now()))
    }, 1000)
    return () => clearInterval(timer)
  }, [target])

  const days = Math.floor(timeLeft / (1000 * 60 * 60 * 24))
  const hours = Math.floor((timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
  const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60))
  const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000)

  return { days, hours, minutes, seconds }
}

function CountdownUnit({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col items-center">
      <span className="text-3xl font-bold tabular-nums text-white sm:text-4xl">
        {String(value).padStart(2, '0')}
      </span>
      <span className="mt-1 text-xs text-slate-400">{label}</span>
    </div>
  )
}

export function FinalCTASection() {
  const { days, hours, minutes, seconds } = useCountdown(DEADLINE)

  return (
    <section className="bg-slate-900 py-20 lg:py-28">
      <Container>
        <AnimateOnScroll>
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-2xl font-bold text-white sm:text-3xl lg:text-4xl">
              지금 신청하면 40% 싸게 시작합니다.
              <br />
              <span className="text-orange-400">단, 27자리만 남았습니다.</span>
            </h2>
            <p className="mt-4 text-lg text-slate-400">
              얼리버드 100명 마감 후 가격이 정상 복구됩니다.
              <br className="hidden sm:block" />
              지금 사전결제하고, 출시 즉시 사용하세요.
            </p>

            <div className="mt-8 flex items-center justify-center gap-4">
              <CountdownUnit value={days} label="일" />
              <span className="text-2xl font-bold text-slate-500 mb-4">:</span>
              <CountdownUnit value={hours} label="시간" />
              <span className="text-2xl font-bold text-slate-500 mb-4">:</span>
              <CountdownUnit value={minutes} label="분" />
              <span className="text-2xl font-bold text-slate-500 mb-4">:</span>
              <CountdownUnit value={seconds} label="초" />
            </div>

            <Button
              size="lg"
              className="mt-8 bg-orange-500 hover:bg-orange-600 text-white border-orange-500 hover:border-orange-600 text-base font-bold px-10"
              href="#signup"
            >
              얼리버드 지금 신청하기 — 40% 할인 적용
            </Button>

            <div className="mt-6 flex flex-wrap items-center justify-center gap-4 text-sm text-slate-400">
              <span>🔒 100% 환불 보장</span>
              <span>💳 카드·계좌이체</span>
              <span>📞 카카오톡 채널 상담</span>
            </div>
          </div>
        </AnimateOnScroll>
      </Container>
    </section>
  )
}
