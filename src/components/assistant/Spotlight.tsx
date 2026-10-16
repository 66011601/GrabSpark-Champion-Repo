import { Mic } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { th } from '@/copy/th.ts'
import { CompanionPose } from './CompanionPose.tsx'
import { poseFor } from './companionPoses.ts'
import type { Choice } from './companionState.ts'

/**
 * What the companion says, over a dimmed page, the way LINE's characters peek in with a tip:
 * a new step's advice, something to fix, or buttons to pick from.
 * The page dims first, then the companion peeks up from behind the phone's bottom edge, in the pose that fits what
 * she says, and her bubble appears.
 * Tapping "เข้าใจแล้ว", the dimmed page, or Escape brings the page back; the talk button brings it back and listens.
 */
interface SpotlightProps {
  text: string
  notice?: string | null
  choices?: Choice[]
  speaking: boolean
  shop?: boolean // Act 2: she carries the delivery bag
  onTalk?: () => void
  onClose: () => void
}

export function Spotlight({ text, notice, choices = [], speaking, shop = false, onTalk, onClose }: SpotlightProps) {
  // Found from a placeholder once it is in the page: on the app's first screen the phone frame is not there yet while this renders.
  const [phone, setPhone] = useState<HTMLElement | null>(null)
  const button = useRef<HTMLButtonElement>(null)
  const close = useRef(onClose)

  useEffect(() => {
    close.current = onClose
  }, [onClose])

  // Focus the button once it shows; the bar re-renders often while it speaks.
  useEffect(() => {
    button.current?.focus({ preventScroll: true })
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && close.current()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [phone])

  if (!phone) return <span hidden ref={(at) => void (at && setPhone(at.closest<HTMLElement>('[data-phone]')))} />
  return createPortal(
    <div role="dialog" aria-modal="true" aria-label={th.companion.spotlight.label} className="absolute inset-0 z-50 overflow-hidden">
      <button type="button" tabIndex={-1} aria-hidden onClick={onClose} className="absolute inset-0 animate-dim cursor-default bg-ink/75" />
      <div className="pointer-events-none absolute inset-x-4 bottom-0 flex flex-col items-end">
        <div className="pointer-events-auto relative max-h-[55%] w-full animate-rise overflow-y-auto rounded-3xl bg-action p-4 text-white shadow-2xl [animation-delay:0.6s] motion-reduce:animate-none">
          <p className="text-sm font-bold text-white/85">{th.grab.aiHelper}</p>
          {notice && <p className="mt-1 rounded-xl bg-warn-bg px-2 py-1 text-base text-warn-ink">{notice}</p>}
          <p className="mt-1 text-lg leading-snug">{text}</p>
          {choices.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {choices.map((choice) => (
                <button key={choice.id} type="button" onClick={choice.onPress} className="min-h-12 cursor-pointer rounded-full bg-surface px-4 text-base font-medium text-action active:bg-ok-bg">
                  {choice.label}
                </button>
              ))}
            </div>
          )}
          {onTalk && (
            <button type="button" onClick={onTalk} className="mt-3 flex min-h-14 w-full cursor-pointer items-center justify-center gap-2 rounded-2xl text-lg font-bold text-white ring-2 ring-white/70 active:bg-action-pressed">
              <Mic className="size-6" aria-hidden />
              {th.companion.spotlight.talk}
            </button>
          )}
          <button ref={button} type="button" onClick={onClose} className="mt-2 min-h-14 w-full cursor-pointer rounded-2xl bg-surface text-lg font-bold text-action active:bg-ok-bg">
            {th.companion.spotlight.gotIt}
          </button>
          </div>
        <span className="relative -mt-2.5 mr-24 size-5 rotate-45 rounded-sm bg-action" aria-hidden />
        <CompanionPose pose={poseFor({ text, notice, asking: choices.length > 0, shop })} speaking={speaking} className="-mt-3 h-60 w-60 shrink-0 translate-x-4" />
      </div>
    </div>,
    phone,
  )
}
