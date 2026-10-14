import { ArrowLeft, HelpCircle } from 'lucide-react'
import type { ReactNode } from 'react'
import { th } from '@/copy/th.ts'

export const TOTAL_STEPS = 7

interface StepShellProps {
  step?: number // 1–7: "ขั้นตอนที่ N จาก 7" and the progress strip
  heading?: string // the header text when there is no step number
  title: string
  subtitle?: string
  onBack?: () => void
  footer: ReactNode // the helper bar and the screen's one green button
  children: ReactNode
}

/** GrabMerchant's form page: header, big title, fields, and a pinned footer. */
export function StepShell({ step, heading, title, subtitle, onBack, footer, children }: StepShellProps) {
  return (
    <>
      <header className="flex min-h-14 items-center gap-1 px-2">
        {onBack ? (
          <button
            type="button"
            onClick={onBack}
            aria-label={th.common.back}
            className="flex size-12 shrink-0 cursor-pointer items-center justify-center rounded-full text-ink active:bg-canvas"
          >
            <ArrowLeft className="size-6" aria-hidden />
          </button>
        ) : (
          <span className="w-3" />
        )}
        <p className="flex-1 text-base font-bold">{step ? th.grab.stepOf(step, TOTAL_STEPS) : heading}</p>
        <span className="flex size-12 items-center justify-center text-ink-muted" title={th.grab.help}>
          <HelpCircle className="size-6" aria-hidden />
          <span className="sr-only">{th.grab.help}</span>
        </span>
      </header>
      {step && (
        <ol className="flex gap-1 px-5" aria-label={th.grab.stepOf(step, TOTAL_STEPS)}>
          {Array.from({ length: TOTAL_STEPS }, (_, index) => (
            <li key={index} className={`h-1 flex-1 rounded-full ${index < step ? 'bg-grab' : 'bg-line'}`} />
          ))}
        </ol>
      )}
      <main className="flex-1 overflow-y-auto px-5 pt-5 pb-6">
        <h1 className="text-2xl font-bold">{title}</h1>
        {subtitle && <p className="mt-1 text-base text-ink-muted">{subtitle}</p>}
        <div className="mt-5 flex flex-col gap-5">{children}</div>
      </main>
      <footer className="flex flex-col gap-3 border-t border-line bg-surface px-4 pt-3 pb-4">{footer}</footer>
    </>
  )
}
