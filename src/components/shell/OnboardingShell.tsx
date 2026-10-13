import type { ReactNode } from 'react'

export function OnboardingShell({ title, progress, footer, children }: { title: string; progress?: string; footer?: ReactNode; children: ReactNode }) {
  return (
    <>
      <header className="flex min-h-14 items-center justify-between gap-3 border-b border-line px-4 py-2">
        <h1 className="text-xl font-bold">{title}</h1>
        {progress && <span className="text-base text-ink-muted">{progress}</span>}
      </header>
      <main className="flex-1 overflow-y-auto px-4 py-4">{children}</main>
      {footer && <footer className="border-t border-line bg-surface px-4 py-3">{footer}</footer>}
    </>
  )
}
