import type { ReactNode } from 'react'

/** Full screen on a phone; a 390×844 phone frame (with an optional side panel) on desktop. */
export function DeviceFrame({ side, children }: { side?: ReactNode; children: ReactNode }) {
  return (
    <div className="min-h-dvh bg-canvas sm:flex sm:items-start sm:justify-center sm:gap-8 sm:p-8">
      <div data-phone className="relative flex h-dvh w-full flex-col overflow-hidden bg-surface sm:h-[min(844px,calc(100dvh-4rem))] sm:w-[390px] sm:shrink-0 sm:rounded-[44px] sm:shadow-2xl sm:ring-8 sm:ring-ink">
        {children}
      </div>
      {side}
    </div>
  )
}
