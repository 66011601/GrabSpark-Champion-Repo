import { X } from 'lucide-react'
import { useEffect, type ReactNode } from 'react'
import { th } from '@/copy/th.ts'

/** A sheet that slides up over the lower part of the phone; the form stays visible above it. */
export function BottomSheet({ open, title, onClose, children }: { open: boolean; title: string; onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null
  return (
    <div className="absolute inset-0 z-20 flex flex-col justify-end bg-ink/40" onClick={onClose}>
      <section
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(event) => event.stopPropagation()}
        className="max-h-[85%] animate-rise overflow-y-auto rounded-t-3xl bg-surface px-4 pt-3 pb-6 shadow-2xl"
      >
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="text-lg font-bold">{title}</h2>
          <button type="button" onClick={onClose} aria-label={th.grab.close} className="flex size-12 cursor-pointer items-center justify-center rounded-full active:bg-canvas">
            <X className="size-6" aria-hidden />
          </button>
        </div>
        {children}
      </section>
    </div>
  )
}
