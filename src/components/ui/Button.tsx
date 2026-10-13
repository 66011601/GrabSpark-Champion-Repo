import { Loader2 } from 'lucide-react'
import type { ButtonHTMLAttributes, ReactNode } from 'react'

type Variant = 'primary' | 'secondary' | 'ghost'

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-action text-white active:bg-action-pressed disabled:bg-line disabled:text-ink-muted',
  secondary: 'border-2 border-action bg-surface text-action active:bg-ok-bg disabled:border-line disabled:text-ink-muted',
  ghost: 'bg-transparent text-action underline-offset-4 hover:underline',
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  fullWidth?: boolean
  loading?: boolean
  icon?: ReactNode
}

export function Button({ variant = 'primary', fullWidth = false, loading = false, icon, className = '', disabled, children, ...rest }: ButtonProps) {
  return (
    <button
      type="button"
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={`inline-flex min-h-14 items-center justify-center gap-2 rounded-2xl px-5 text-lg font-bold transition-colors ${VARIANTS[variant]} ${fullWidth ? 'w-full' : ''} ${className}`}
      {...rest}
    >
      {loading ? <Loader2 className="size-6 animate-spin" aria-hidden /> : icon}
      {children}
    </button>
  )
}
