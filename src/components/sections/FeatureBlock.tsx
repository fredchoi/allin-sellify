import { AnimateOnScroll } from '../ui/AnimateOnScroll'
import { Check, getFeatureIcon } from '../icons'
import type { Feature } from '../../types'

interface FeatureBlockProps {
  feature: Feature
  reversed: boolean
}

export function FeatureBlock({ feature, reversed }: FeatureBlockProps) {
  const IconComponent = getFeatureIcon(feature.icon)

  return (
    <AnimateOnScroll animation={reversed ? 'slide-left' : 'slide-right'}>
      <div
        className={`flex flex-col gap-8 lg:flex-row lg:items-center lg:gap-16 ${
          reversed ? 'lg:flex-row-reverse' : ''
        }`}
      >
        <div className="flex-1">
          <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary-light">
            <IconComponent className="h-6 w-6 text-primary" />
          </div>
          <h3 className="text-2xl font-bold text-slate-900">{feature.title}</h3>
          <p className="mt-2 text-lg text-slate-600">{feature.hook}</p>
          <ul className="mt-6 space-y-3">
            {feature.bullets.map((bullet) => (
              <li key={bullet} className="flex items-start gap-3">
                <Check className="mt-0.5 h-5 w-5 shrink-0 text-emerald-500" />
                <span className="text-slate-600">{bullet}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="flex-1">
          <div className="overflow-hidden rounded-xl border border-slate-200 shadow-sm">
            <img
              src={`/images/features/${feature.image}.png`}
              alt={`${feature.title} 스크린샷`}
              className="w-full h-auto"
              loading="lazy"
            />
          </div>
        </div>
      </div>
    </AnimateOnScroll>
  )
}
