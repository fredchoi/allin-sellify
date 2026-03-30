import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '../../lib/utils'
import { Check } from '../icons'

const badgeVariants = cva(
  'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium',
  {
    variants: {
      variant: {
        default: 'bg-slate-100 text-slate-700',
        primary: 'bg-primary-light text-primary',
        success: 'bg-emerald-50 text-emerald-700',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
)

type BadgeProps = VariantProps<typeof badgeVariants> & {
  children: React.ReactNode
  className?: string
  withCheck?: boolean
}

export function Badge({ children, variant, className, withCheck }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant }), className)}>
      {withCheck && <Check className="h-3.5 w-3.5" />}
      {children}
    </span>
  )
}
