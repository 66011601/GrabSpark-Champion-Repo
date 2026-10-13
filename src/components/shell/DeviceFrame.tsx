import type { ReactNode } from 'react'

/** Full screen on a phone; a 390×844 phone frame (with an optional side panel) on desktop. */
export function DeviceFrame({ side, children }: { side?: ReactNode; children: ReactNode }) {
  return (
    <div className="min-h-dvh bg-canvas sm:flex sm:items-start sm:justify-center sm:gap-8 sm:p-8">
      <div className="relative flex h-dvh w-full flex-col overflow-hidden bg-surface sm:h-[844px] sm:w-[390px] sm:shrink-0 sm:rounded-[44px] sm:shadow-2xl sm:ring-8 sm:ring-ink">
        {children}
      </div>
      {side}
    </div>
  )
}
