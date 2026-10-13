import { AlertCircle } from 'lucide-react'
import type { ComponentProps, ReactNode } from 'react'

interface TextFieldProps extends ComponentProps<'input'> {
  id: string
  label: string
  optional?: string // shown after the label, e.g. "(ถ้ามี)"
  hint?: string
  error?: string | null
  trailing?: ReactNode // sits inside the box on the right
}

/** A labelled text box, tall enough to tap. The label is always visible; errors appear right under the box. */
export function TextField({ id, label, optional, hint, error, trailing, className = '', ...rest }: TextFieldProps) {
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-lg font-bold">
        {label}
        {optional && <span className="font-normal text-ink-muted"> {optional}</span>}
      </label>
      <div className="relative">
        <input
          id={id}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={`min-h-14 w-full rounded-2xl border-2 bg-surface px-4 text-lg transition-colors placeholder:text-ink-muted focus:border-action focus:ring-4 focus:ring-grab/25 focus:outline-none ${error ? 'border-warn-ink' : 'border-field'} ${trailing ? 'pr-14' : ''} ${className}`}
          {...rest}
        />
        {trailing && <div className="absolute inset-y-0 right-1 flex items-center">{trailing}</div>}
      </div>
      {error ? (
        <p id={`${id}-error`} role="alert" className="flex items-start gap-2 text-base text-warn-ink">
          <AlertCircle className="mt-1 size-5 shrink-0" aria-hidden />
          {error}
        </p>
      ) : (
        hint && (
          <p id={`${id}-hint`} className="text-base text-ink-muted">
            {hint}
          </p>
        )
      )}
    </div>
  )
}
