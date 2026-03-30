import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '../../lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center font-semibold transition-all duration-200 cursor-pointer rounded-lg disabled:opacity-50 disabled:cursor-not-allowed',
  {
    variants: {
      variant: {
        primary:
          'bg-primary text-white hover:bg-primary-hover hover:scale-[1.02] hover:shadow-lg',
        secondary:
          'border-2 border-slate-300 text-slate-700 hover:bg-slate-50 hover:border-slate-400',
        ghost: 'text-slate-600 hover:text-slate-900 hover:underline',
      },
      size: {
        sm: 'px-4 py-2 text-sm',
        md: 'px-6 py-3 text-base',
        lg: 'px-8 py-4 text-lg',
      },
      fullWidth: {
        true: 'w-full',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  }
)

type ButtonProps = VariantProps<typeof buttonVariants> & {
  children: React.ReactNode
  className?: string
  href?: string
  onClick?: () => void
}

export function Button({
  children,
  variant,
  size,
  fullWidth,
  className,
  href,
  onClick,
}: ButtonProps) {
  const classes = cn(buttonVariants({ variant, size, fullWidth }), className)

  if (href) {
    return (
      <a href={href} className={classes}>
        {children}
      </a>
    )
  }

  return (
    <button onClick={onClick} className={classes}>
      {children}
    </button>
  )
}
