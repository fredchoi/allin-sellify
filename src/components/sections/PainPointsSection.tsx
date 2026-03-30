import { Container } from '../ui/Container'
import { Card } from '../ui/Card'
import { SectionHeading } from '../ui/SectionHeading'
import { AnimateOnScroll } from '../ui/AnimateOnScroll'
import { getPainPointIcon } from '../icons'
import { painPoints } from '../../data/painPoints'

export function PainPointsSection() {
  return (
    <section className="py-20 lg:py-28">
      <Container>
        <SectionHeading title="혹시 이런 상황, 익숙하지 않으세요?" />

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {painPoints.map((point, index) => {
            const IconComponent = getPainPointIcon(point.icon)
            return (
              <AnimateOnScroll key={index} delay={index * 0.1}>
                <Card hover className="text-center h-full">
                  <div className="flex justify-center">
                    <IconComponent className="h-16 w-16" />
                  </div>
                  <h3 className="mt-4 text-lg font-bold text-slate-900">
                    {point.title}
                  </h3>
                  <p className="mt-2 text-sm text-slate-500 leading-relaxed">
                    {point.description}
                  </p>
                </Card>
              </AnimateOnScroll>
            )
          })}
        </div>

        <AnimateOnScroll className="mt-12 text-center">
          <p className="text-xl font-semibold text-primary">
            이 모든 문제, 하나의 플랫폼에서 해결됩니다.
          </p>
        </AnimateOnScroll>
      </Container>
    </section>
  )
}
