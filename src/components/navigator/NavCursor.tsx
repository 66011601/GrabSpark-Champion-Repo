import { Pointer } from 'lucide-react'
import { useLayoutEffect, useRef, useState } from 'react'

/**
 * The AI's finger. It moves to the element marked `data-nav="{target}"` inside its parent, which must be
 * `relative`, and ripples each time `taps` goes up. It never clicks anything itself: the screen state changes in the runner.
 */
export function NavCursor({ target, taps }: { target: string | null; taps: number }) {
  const self = useRef<HTMLDivElement>(null)
  const [at, setAt] = useState<{ x: number; y: number } | null>(null)

  useLayoutEffect(() => {
    const root = self.current?.parentElement
    const element = target && root ? root.querySelector<HTMLElement>(`[data-nav="${target}"]`) : null
    if (!root || !element) {
      setAt(null)
      return
    }
    // Scroll the screen's own list, not the whole page (scrollIntoView would move the phone frame too).
    const list = element.closest('main')
    if (list) list.scrollTop += element.getBoundingClientRect().top - list.getBoundingClientRect().top - (list.clientHeight - element.offsetHeight) / 2
    const from = root.getBoundingClientRect()
    const to = element.getBoundingClientRect()
    setAt({ x: to.left - from.left + to.width / 2, y: to.top - from.top + to.height / 2 })
  }, [target])

  return (
    <div ref={self} aria-hidden className="pointer-events-none absolute inset-0 z-30">
      {at && (
        <div className="absolute transition-all duration-500 ease-out" style={{ left: at.x, top: at.y }}>
          {taps > 0 && <span key={taps} className="absolute -top-5 -left-5 size-12 animate-pop rounded-full bg-grab/50" />}
          <Pointer className="relative -mt-2 -ml-3 size-10 fill-white text-ink drop-shadow-lg" />
        </div>
      )}
    </div>
  )
}
