import { Button } from '../ui/Button'
import { Badge } from '../ui/Badge'
import { Check } from '../icons'
import { cn } from '../../lib/utils'
import type { PricingTier } from '../../types'

interface PricingCardProps {
  tier: PricingTier
}

export function PricingCard({ tier }: PricingCardProps) {
  return (
    <div
      className={cn(
        'relative flex flex-col rounded-xl border-2 bg-white p-6 lg:p-8',
        tier.highlighted
          ? 'border-primary shadow-lg lg:scale-105'
          : 'border-slate-200'
      )}
    >
      {tier.earlyBirdBadge && (
        <Badge variant={tier.highlighted ? 'primary' : 'default'} className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap">
          {tier.earlyBirdBadge}
        </Badge>
      )}

      <div>
        <h3 className="text-xl font-bold text-slate-900">{tier.name}</h3>
        <div className="mt-4 flex items-baseline gap-2">
          <span className={cn('text-3xl font-bold', tier.highlighted ? 'text-primary' : 'text-slate-900')}>
            {tier.price}
          </span>
          <span className="text-slate-500 text-sm">/ {tier.period}</span>
        </div>
        {tier.originalPrice && (
          <p className="mt-1 text-sm text-slate-400">
            정가 <s>{tier.originalPrice}</s>
          </p>
        )}
        {tier.discount && (
          <Badge variant="success" className="mt-2">
            {tier.discount}
          </Badge>
        )}
      </div>

      <ul className="mt-6 flex-1 space-y-3">
        {tier.features.map((feature) => (
          <li key={feature} className="flex items-start gap-2.5">
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
            <span className="text-sm text-slate-600">{feature}</span>
          </li>
        ))}
      </ul>

      <Button
        variant={tier.highlighted ? 'primary' : 'secondary'}
        fullWidth
        className="mt-8"
        href={tier.ctaHref ?? '#signup'}
      >
        {tier.cta}
      </Button>
    </div>
  )
}
