import { Container } from '../ui/Container'
import { SectionHeading } from '../ui/SectionHeading'
import { AnimateOnScroll } from '../ui/AnimateOnScroll'
import { Badge } from '../ui/Badge'
import { PricingCard } from './PricingCard'
import { pricingTiers } from '../../data/pricing'

const EARLY_BIRD_TOTAL = 100
const EARLY_BIRD_JOINED = 73

export function PricingSection() {
  const progressPct = Math.round((EARLY_BIRD_JOINED / EARLY_BIRD_TOTAL) * 100)

  return (
    <section id="pricing" className="bg-surface py-20 lg:py-28">
      <Container>
        <SectionHeading
          title="지금 시작하면 40% 더 저렴합니다"
          subtitle="얼리버드 모집은 100명이 마감됩니다."
        />

        <AnimateOnScroll>
          <div className="mx-auto mb-10 max-w-lg">
            <div className="flex items-center justify-between mb-2 text-sm font-medium">
              <span className="text-slate-700">현재 모집 현황</span>
              <span className="text-orange-600 font-bold">{EARLY_BIRD_JOINED}/{EARLY_BIRD_TOTAL}명 참여 중</span>
            </div>
            <div className="h-3 w-full rounded-full bg-slate-200 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-orange-400 to-orange-500 transition-all duration-1000"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <p className="mt-2 text-xs text-slate-500 text-right">
              잔여 {EARLY_BIRD_TOTAL - EARLY_BIRD_JOINED}자리
            </p>
          </div>
        </AnimateOnScroll>

        <AnimateOnScroll delay={0.1}>
          <div className="mx-auto grid max-w-4xl gap-6 sm:grid-cols-3">
            {pricingTiers.map((tier) => (
              <PricingCard key={tier.name} tier={tier} />
            ))}
          </div>
        </AnimateOnScroll>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <Badge withCheck>사전결제 후 개발 현황 매주 공유</Badge>
          <Badge withCheck>베타 출시 전 취소 시 100% 환불 보장</Badge>
          <Badge withCheck>얼리버드 가격 영구 동결</Badge>
        </div>
      </Container>
    </section>
  )
}
