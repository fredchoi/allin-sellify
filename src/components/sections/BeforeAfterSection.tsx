import { Container } from '../ui/Container'
import { SectionHeading } from '../ui/SectionHeading'
import { AnimateOnScroll } from '../ui/AnimateOnScroll'
import { X, Check } from '../icons'
import { comparisons, summary } from '../../data/beforeAfter'

export function BeforeAfterSection() {
  return (
    <section className="py-20 lg:py-28">
      <Container>
        <SectionHeading title="도입 전 vs 도입 후, 하루가 달라집니다" />

        <AnimateOnScroll>
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Before */}
            <div className="rounded-xl border-2 border-red-100 bg-red-50/30 p-6 lg:p-8">
              <h3 className="mb-6 text-xl font-bold text-red-600">
                Before — 수동 운영
              </h3>
              <div className="space-y-4">
                {comparisons.map((row) => (
                  <div key={row.label} className="flex items-start gap-3">
                    <X className="mt-0.5 h-5 w-5 shrink-0 text-red-400" />
                    <div>
                      <p className="text-sm font-medium text-slate-500">{row.label}</p>
                      <p className="text-slate-700">{row.before}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-6 rounded-lg bg-red-100/50 p-4">
                <p className="font-semibold text-red-700">{summary.before.daily}</p>
                <p className="text-sm text-red-600">{summary.before.scale}</p>
              </div>
            </div>

            {/* After */}
            <div className="rounded-xl border-2 border-emerald-100 bg-emerald-50/30 p-6 lg:p-8">
              <h3 className="mb-6 text-xl font-bold text-emerald-600">
                After — 셀러 올인원
              </h3>
              <div className="space-y-4">
                {comparisons.map((row) => (
                  <div key={row.label} className="flex items-start gap-3">
                    <Check className="mt-0.5 h-5 w-5 shrink-0 text-emerald-500" />
                    <div>
                      <p className="text-sm font-medium text-slate-500">{row.label}</p>
                      <p className="text-slate-700">{row.after}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-6 rounded-lg bg-emerald-100/50 p-4">
                <p className="font-semibold text-emerald-700">{summary.after.daily}</p>
                <p className="text-sm text-emerald-600">{summary.after.scale}</p>
              </div>
            </div>
          </div>
        </AnimateOnScroll>
      </Container>
    </section>
  )
}
