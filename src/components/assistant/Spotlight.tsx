import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { th } from '@/copy/th.ts'
import { Avatar3D } from './Avatar3D.tsx'

/**
 * A new step's advice, said by the 3D companion over a dimmed page, the way LINE's characters peek in with a tip.
 * The page dims first, then the companion rises at the right edge and its bubble appears.
 * Tapping "เข้าใจแล้ว", the dimmed page, or Escape brings the page back. Voice keeps working underneath.
 */
export function Spotlight({ text, speaking, onClose }: { text: string; speaking: boolean; onClose: () => void }) {
  const [phone] = useState(() => document.querySelector<HTMLElement>('[data-phone]'))
  const button = useRef<HTMLButtonElement>(null)
  const close = useRef(onClose)

  useEffect(() => {
    close.current = onClose
  }, [onClose])

  // Focus the button once, when the spotlight opens; the bar re-renders often while it speaks.
  useEffect(() => {
    button.current?.focus({ preventScroll: true })
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && close.current()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  if (!phone) return null
  return createPortal(
    <div role="dialog" aria-modal="true" aria-label={th.companion.spotlight.label} className="absolute inset-0 z-50 overflow-hidden">
      <button type="button" tabIndex={-1} aria-hidden onClick={onClose} className="absolute inset-0 animate-dim cursor-default bg-ink/75" />
      <div className="pointer-events-none absolute right-0 bottom-20 left-4 flex items-end justify-end">
        <div className="pointer-events-auto relative mb-36 -mr-6 max-w-64 animate-rise rounded-3xl bg-action p-4 text-white shadow-2xl [animation-delay:0.6s] motion-reduce:animate-none">
          <p className="text-sm font-bold text-white/85">{th.grab.aiHelper}</p>
          <p aria-live="polite" className="mt-1 text-lg leading-snug">
            {text}
          </p>
          <button ref={button} type="button" onClick={onClose} className="mt-3 min-h-14 w-full cursor-pointer rounded-2xl bg-surface text-lg font-bold text-action active:bg-ok-bg">
            {th.companion.spotlight.gotIt}
          </button>
          <span className="absolute -right-2 bottom-8 size-5 rotate-45 rounded-sm bg-action" aria-hidden />
        </div>
        <Avatar3D speaking={speaking} className="h-64 w-48 shrink-0 translate-x-8" />
      </div>
    </div>,
    phone,
  )
}
