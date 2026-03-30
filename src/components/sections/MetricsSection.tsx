import { Container } from '../ui/Container'
import { MetricCard } from './MetricCard'
import { metrics } from '../../data/metrics'

export function MetricsSection() {
  return (
    <section className="bg-gradient-to-br from-primary to-blue-700 py-20 lg:py-28">
      <Container>
        <h2 className="mb-12 text-center text-2xl font-bold text-white sm:text-3xl lg:mb-16 lg:text-4xl">
          숫자로 증명합니다
        </h2>
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          {metrics.map((metric, index) => (
            <MetricCard key={index} metric={metric} />
          ))}
        </div>
      </Container>
    </section>
  )
}
