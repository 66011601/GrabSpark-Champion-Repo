import type { ReactNode } from 'react'

type Tone = 'default' | 'warn'

const TONES: Record<Tone, string> = {
  default: 'bg-surface ring-line',
  warn: 'bg-warn-bg ring-warn-ink/30',
}

export function Card({ tone = 'default', className = '', children }: { tone?: Tone; className?: string; children: ReactNode }) {
  return <div className={`rounded-3xl p-5 ring-1 ${TONES[tone]} ${className}`}>{children}</div>
}
