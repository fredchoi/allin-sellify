import { Container } from '../ui/Container'
import { SectionHeading } from '../ui/SectionHeading'
import { AnimateOnScroll } from '../ui/AnimateOnScroll'
import { ArrowRight } from '../icons'
import { pipelineSteps } from '../../data/pipeline'

export function PipelineSection() {
  return (
    <section className="bg-surface py-20 lg:py-28">
      <Container>
        <SectionHeading title="클릭 몇 번이면 상품이 매출이 됩니다" />

        {/* Desktop: horizontal flow */}
        <div className="hidden lg:block">
          <div className="flex items-center justify-center gap-4">
            {pipelineSteps.map((step, index) => (
              <AnimateOnScroll key={index} delay={index * 0.12} className="flex items-center">
                <div className="flex flex-col items-center text-center">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-white text-lg font-bold shadow-md">
                    {step.number}
                  </div>
                  <h3 className="mt-3 text-base font-bold text-slate-900">
                    {step.title}
                  </h3>
                  <p className="mt-1 text-xs font-medium text-primary">
                    {step.badge}
                  </p>
                </div>
                {index < pipelineSteps.length - 1 && (
                  <ArrowRight className="mx-2 h-4 w-4 shrink-0 text-slate-300" />
                )}
              </AnimateOnScroll>
            ))}
          </div>
        </div>

        {/* Mobile: horizontal scroll */}
        <div className="lg:hidden">
          <div className="flex items-center gap-3 overflow-x-auto pb-4 -mx-4 px-4 snap-x snap-mandatory">
            {pipelineSteps.map((step, index) => (
              <div key={index} className="flex items-center snap-center">
                <div className="flex flex-col items-center text-center min-w-[72px]">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-white font-bold shadow-md">
                    {step.number}
                  </div>
                  <h3 className="mt-2 text-sm font-bold text-slate-900">
                    {step.title}
                  </h3>
                  <p className="mt-0.5 text-[10px] font-medium text-primary">
                    {step.badge}
                  </p>
                </div>
                {index < pipelineSteps.length - 1 && (
                  <ArrowRight className="mx-1 h-3.5 w-3.5 shrink-0 text-slate-300" />
                )}
              </div>
            ))}
          </div>
        </div>
      </Container>
    </section>
  )
}
