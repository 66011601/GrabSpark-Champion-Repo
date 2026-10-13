import type { ReactNode } from 'react'

export function Chip({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="min-h-14 rounded-full border-2 border-action bg-surface px-5 text-lg font-bold text-action active:bg-ok-bg"
    >
      {children}
    </button>
  )
}
