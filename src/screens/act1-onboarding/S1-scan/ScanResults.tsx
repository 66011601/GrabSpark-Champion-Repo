import { AlertTriangle, CheckCircle2 } from 'lucide-react'
import { CHECK_THRESHOLD } from '@/ai/onboarding/profile.ts'
import { th } from '@/copy/th.ts'
import type { ScanLine } from './scanLines.ts'

const STAGGER_MS = 120

/** The values read from the photo, appearing one by one; an unclear one is amber. */
export function ScanResults({ lines }: { lines: ScanLine[] }) {
  return (
    <ul className="divide-y divide-line rounded-3xl ring-1 ring-line">
      {lines.map((line, index) => {
        const unsure = line.confidence < CHECK_THRESHOLD
        return (
          <li
            key={`${line.label}-${index}`}
            className={`flex min-h-14 animate-rise items-center gap-3 px-4 py-2 first:rounded-t-3xl last:rounded-b-3xl ${unsure ? 'bg-warn-bg' : ''}`}
            style={{ animationDelay: `${index * STAGGER_MS}ms` }}
          >
            {unsure ? (
              <AlertTriangle className="size-6 shrink-0 text-warn-ink" aria-hidden />
            ) : (
              <CheckCircle2 className="size-6 shrink-0 text-action" aria-hidden />
            )}
            <span className="w-32 shrink-0 text-base text-ink-muted">{line.label}</span>
            <span className={`min-w-0 flex-1 font-bold ${unsure ? 'text-warn-ink' : ''}`}>
              {line.value}
              {unsure && <span className="sr-only"> ({th.review.pleaseCheck})</span>}
            </span>
          </li>
        )
      })}
    </ul>
  )
}
