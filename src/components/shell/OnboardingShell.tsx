import { ChevronLeft } from 'lucide-react'
import type { ReactNode } from 'react'
import { th } from '@/copy/th.ts'

interface OnboardingShellProps {
  title: string
  progress?: string
  onBack?: () => void
  dock?: ReactNode // the CompanionDock for this screen
  children: ReactNode
}

export function OnboardingShell({ title, progress, onBack, dock, children }: OnboardingShellProps) {
  return (
    <>
      <header className="flex min-h-14 items-center gap-1 border-b border-line px-4 py-2">
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            aria-label={th.common.back}
            className="-ml-3 flex size-14 shrink-0 cursor-pointer items-center justify-center rounded-full text-ink active:bg-canvas"
          >
            <ChevronLeft className="size-7" aria-hidden />
          </button>
        )}
        <h1 className="flex-1 text-xl font-bold">{title}</h1>
        {progress && <span className="text-base text-ink-muted">{progress}</span>}
      </header>
      <main className="flex-1 overflow-y-auto px-4 py-4">{children}</main>
      {dock}
    </>
  )
}
