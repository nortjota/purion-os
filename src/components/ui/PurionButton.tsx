'use client'

import { forwardRef } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

const purionButtonVariants = cva(
  // Sempre pílula, foco azul-gelo. 3 tipos do manual: primário (off-white), destaque (verde) e secundário (contorno).
  'inline-flex items-center justify-center gap-2 rounded-full font-medium whitespace-nowrap select-none transition-all outline-none focus-visible:shadow-[0_0_0_4px_var(--ring)] disabled:pointer-events-none disabled:opacity-50 active:scale-[0.97]',
  {
    variants: {
      variant: {
        primary:   'bg-[var(--primary)] text-[var(--primary-foreground)] hover:bg-[var(--primary)]/85',
        accent:    'bg-[var(--brand-accent)] text-[var(--on-accent)] hover:bg-[var(--brand-accent)]/85',
        secondary: 'bg-transparent border border-[var(--foreground)]/20 text-[var(--text-primary)] hover:bg-[var(--bg-surface)] hover:border-[var(--foreground)]/35',
        ghost:     'bg-transparent text-[var(--text-secondary)] hover:bg-[var(--bg-surface)] hover:text-[var(--text-primary)]',
        danger:    'border border-[var(--status-danger)]/40 text-[var(--status-danger)] hover:bg-[var(--status-danger)]/10',
      },
      size: {
        sm: 'min-h-[36px] pointer-coarse:min-h-[44px] px-4 text-[12px]',
        md: 'min-h-[44px] px-5 text-[13px]',
        lg: 'min-h-[48px] px-6 text-[14px]',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  }
)

interface PurionButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof purionButtonVariants> {
  loading?: boolean
}

export const PurionButton = forwardRef<HTMLButtonElement, PurionButtonProps>(
  ({ className, variant, size, loading, disabled, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(purionButtonVariants({ variant, size }), className)}
        {...props}
      >
        {loading ? (
          <>
            <Loader2 size={14} className="animate-spin" />
            <span>Aguarde...</span>
          </>
        ) : children}
      </button>
    )
  }
)

PurionButton.displayName = 'PurionButton'
