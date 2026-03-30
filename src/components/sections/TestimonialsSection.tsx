import { Container } from '../ui/Container'
import { SectionHeading } from '../ui/SectionHeading'
import { AnimateOnScroll } from '../ui/AnimateOnScroll'
import { Quote } from '../icons'
import { testimonials } from '../../data/testimonials'

export function TestimonialsSection() {
  return (
    <section id="testimonials" className="py-20 lg:py-28">
      <Container>
        <SectionHeading title="실제 셀러들의 이야기" />

        {/* Desktop: 3-column grid */}
        <div className="hidden gap-6 md:grid md:grid-cols-3">
          {testimonials.map((t, index) => (
            <AnimateOnScroll key={index} delay={index * 0.15}>
              <div className="flex h-full flex-col rounded-xl border border-slate-200 bg-white p-6 lg:p-8">
                <Quote className="mb-4 h-8 w-8 text-primary/20" />
                <p className="flex-1 text-slate-700 leading-relaxed">
                  "{t.quote}"
                </p>
                <div className="mt-6 border-t border-slate-100 pt-4">
                  <p className="font-semibold text-slate-900">{t.name}</p>
                  <p className="text-sm text-slate-500">{t.role}</p>
                </div>
              </div>
            </AnimateOnScroll>
          ))}
        </div>

        {/* Mobile: horizontal scroll */}
        <div className="flex gap-4 overflow-x-auto snap-x snap-mandatory pb-4 md:hidden -mx-4 px-4">
          {testimonials.map((t, index) => (
            <div
              key={index}
              className="min-w-[85vw] snap-center rounded-xl border border-slate-200 bg-white p-6"
            >
              <Quote className="mb-3 h-6 w-6 text-primary/20" />
              <p className="text-slate-700 leading-relaxed">"{t.quote}"</p>
              <div className="mt-4 border-t border-slate-100 pt-3">
                <p className="font-semibold text-slate-900">{t.name}</p>
                <p className="text-sm text-slate-500">{t.role}</p>
              </div>
            </div>
          ))}
        </div>
      </Container>
    </section>
  )
}
