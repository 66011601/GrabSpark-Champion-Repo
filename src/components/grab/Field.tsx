import { AlertCircle, AlertTriangle, Check, ChevronDown, Sparkles } from 'lucide-react'
import type { ReactNode } from 'react'
import { Button } from '@/components/ui/Button.tsx'
import { th } from '@/copy/th.ts'
import type { FieldMark } from './fieldMarks.ts'

/** GrabMerchant's text box: rounded, thin border, green when focused. */
export const inputClass = (invalid = false) =>
  `min-h-14 w-full rounded-xl border bg-surface px-4 text-lg transition-colors placeholder:text-ink-muted focus:border-action focus:ring-2 focus:ring-grab/25 focus:outline-none ${invalid ? 'border-warn-ink' : 'border-field'}`

interface FieldProps {
  id: string
  label: string
  required?: boolean
  hint?: string
  error?: string | null
  mark?: FieldMark | null // the companion filled this field
  onCheck?: (() => void) | null // set when the value is unsure: shown amber with a ✓
  children: ReactNode
}

/** A labelled form row: label (with * when required), the input, then an error, the AI source or a hint. */
export function Field({ id, label, required = false, hint, error, mark, onCheck, children }: FieldProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between gap-2">
        <label htmlFor={id} className="text-base font-bold">
          {label}
          {required && <span className="text-red-700"> *</span>}
        </label>
        {mark && (
          <span className="flex shrink-0 items-center gap-1 rounded-full bg-ok-bg px-2 text-sm font-medium text-action">
            <Sparkles className="size-4" aria-hidden />
            {th.grab.aiFilled}
          </span>
        )}
      </div>
      <div className={onCheck ? 'rounded-2xl bg-warn-bg p-1 ring-2 ring-warn-ink/40' : ''}>{children}</div>
      {onCheck && (
        <div className="flex items-center justify-between gap-2 text-base text-warn-ink">
          <span className="flex items-center gap-1.5">
            <AlertTriangle className="size-5 shrink-0" aria-hidden />
            {th.grab.pleaseCheck}
          </span>
          <Button variant="secondary" className="min-h-12! px-3!" icon={<Check className="size-5" aria-hidden />} onClick={onCheck}>
            {th.grab.looksRight}
          </Button>
        </div>
      )}
      {error ? (
        <p id={`${id}-error`} role="alert" className="flex items-start gap-2 text-base text-warn-ink">
          <AlertCircle className="mt-1 size-5 shrink-0" aria-hidden />
          {error}
        </p>
      ) : mark ? (
        <p className="text-sm text-ink-muted">{mark.spoken ? th.grab.heard(mark.source) : th.grab.source(mark.source)}</p>
      ) : (
        hint && (
          <p id={`${id}-hint`} className="text-sm text-ink-muted">
            {hint}
          </p>
        )
      )}
    </div>
  )
}

interface SelectProps {
  id: string
  value: string
  options: { value: string; label: string }[]
  placeholder: string
  onChange: (value: string) => void
  invalid?: boolean
}

/** GrabMerchant's dropdown: the same box as a text field, with a chevron. */
export function Select({ id, value, options, placeholder, onChange, invalid = false }: SelectProps) {
  return (
    <div className="relative">
      <select id={id} value={value} onChange={(event) => onChange(event.target.value)} className={`${inputClass(invalid)} appearance-none pr-12`}>
        <option value="" disabled>
          {placeholder}
        </option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute top-1/2 right-4 size-5 -translate-y-1/2 text-ink-muted" aria-hidden />
    </div>
  )
}
