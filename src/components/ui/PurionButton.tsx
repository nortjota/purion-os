'use client'

import { forwardRef } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

const purionButtonVariants = cva(
  'inline-flex items-center justify-center gap-2 font-medium whitespace-nowrap select-none transition-all outline-none disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]',
  {
    variants: {
      variant: {
        primary:   'bg-[#C9A84C] text-[#0D0D0D] hover:bg-[#B8943E]',
        secondary: 'bg-transparent border border-[var(--border)] text-[var(--text-primary)] hover:bg-[var(--bg-surface)]',
        ghost:     'bg-transparent text-[var(--text-secondary)] hover:bg-[var(--bg-surface)] hover:text-[var(--text-primary)]',
        danger:    'border border-[rgba(239,68,68,0.4)] text-[#EF4444] hover:bg-[rgba(239,68,68,0.08)]',
      },
      size: {
        sm: 'h-[30px] px-3 text-[12px] rounded-[6px]',
        md: 'h-[38px] px-4 text-[13px] rounded-[8px]',
        lg: 'h-[44px] px-5 text-[14px] rounded-[10px]',
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
