import type { ReactNode } from 'react'

const CORNERS = ['top-3 left-3 border-t-4 border-l-4', 'top-3 right-3 border-t-4 border-r-4', 'bottom-3 left-3 border-b-4 border-l-4', 'bottom-3 right-3 border-r-4 border-b-4']

/** A dark camera frame with green corners. While `scanning`, a green line sweeps down over the document. */
export function Viewfinder({ scanning, children }: { scanning: boolean; children: ReactNode }) {
  return (
    <div className="relative flex min-h-56 items-center justify-center overflow-hidden rounded-3xl bg-ink px-8 py-8">
      {CORNERS.map((corner) => (
        <span key={corner} className={`absolute size-8 rounded-sm border-grab ${corner}`} aria-hidden />
      ))}
      {children}
      {scanning && (
        <span
          className="absolute inset-x-4 h-1 animate-scan rounded-full bg-grab shadow-[0_0_16px_4px] shadow-grab/60 motion-reduce:animate-none motion-reduce:top-1/2"
          aria-hidden
        />
      )}
    </div>
  )
}
