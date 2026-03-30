import { useRef, useState, useEffect } from 'react'
import { useCountUp } from '../../hooks/useCountUp'
import type { Metric } from '../../types'

interface MetricCardProps {
  metric: Metric
}

export function MetricCard({ metric }: MetricCardProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true)
          observer.disconnect()
        }
      },
      { threshold: 0.3 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const display = useCountUp({
    end: metric.value,
    decimal: metric.decimal ?? 0,
    enabled: visible,
  })

  return (
    <div ref={ref} className="text-center">
      <p className="text-4xl font-bold text-white sm:text-5xl">
        {metric.prefix}
        {display}
        {metric.suffix}
      </p>
      <p className="mt-2 text-lg font-semibold text-blue-100">{metric.label}</p>
      <p className="mt-1 text-sm text-blue-200">{metric.description}</p>
    </div>
  )
}
