import { useEffect, useRef } from 'react'
import { type LayerPose, pose } from './companionPose.ts'

// The layers were cut from GrabMerchant's strawberry-girl artwork by scripts/companion-layers/build.html.
// Sizes and pivots are in the layers' pixels.
const ART = { width: 832, height: 754 }
const LAYERS = [
  { name: 'body', pivot: [414, 754], shadow: false },
  { name: 'head', pivot: [414, 556], shadow: true }, // turns on her neck
  { name: 'handL', pivot: [169, 680], shadow: true }, // each hand turns at its wrist, where it meets the sleeve
  { name: 'handR', pivot: [684, 680], shadow: true },
] as const
type LayerName = (typeof LAYERS)[number]['name']

const ENTER_DELAY = 0.25 // seconds: the page dims first, then she comes up
const ENTER_TIME = 0.7
const easeOutBack = (t: number) => 1 + 2.2 * (t - 1) ** 3 + 1.2 * (t - 1) ** 2

const css = ({ x, y, rotate, scaleY }: LayerPose) => `translate(${x}%, ${y}%) rotate(${rotate}deg) scaleY(${scaleY})`

/**
 * The companion in 2.5D: her artwork in four layers (body, head, two thumbs-up hands) that move apart a little by
 * depth as the pointer moves or, left alone, as she sways; she breathes, says hello with her thumbs and bobs while
 * talking. `close` frames her head for the small round avatar; otherwise she rises into view. Still with reduced motion.
 */
export function CompanionFigure({ speaking, close = false, className = '' }: { speaking: boolean; close?: boolean; className?: string }) {
  const art = useRef<HTMLDivElement>(null)
  const layers = useRef<Partial<Record<LayerName, HTMLImageElement | null>>>({})
  const talking = useRef(speaking)

  useEffect(() => {
    talking.current = speaking
  }, [speaking])

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const pointer = { x: 0, y: 0, at: -Infinity }
    const onMove = (event: PointerEvent) => {
      pointer.x = (event.clientX / window.innerWidth) * 2 - 1
      pointer.y = (event.clientY / window.innerHeight) * 2 - 1
      pointer.at = performance.now()
    }
    window.addEventListener('pointermove', onMove, { passive: true })
    const start = performance.now()
    const tilt = { x: 0, y: 0 }
    let frame = requestAnimationFrame(function draw(now) {
      const t = (now - start) / 1000
      // follow the pointer for a while after it moves, otherwise drift gently on her own
      const following = now - pointer.at < 3000
      const goalX = following ? pointer.x : Math.sin(t * 0.5) * 0.5
      const goalY = following ? pointer.y : Math.sin(t * 0.37) * 0.3
      tilt.x += (goalX - tilt.x) * 0.06
      tilt.y += (goalY - tilt.y) * 0.06
      const p = pose(t, { tiltX: tilt.x, tiltY: tilt.y, talking: talking.current, entering: !close })
      for (const { name } of LAYERS) {
        const layer = layers.current[name]
        if (layer) layer.style.transform = css(p[name])
      }
      if (art.current && !close) {
        const enter = Math.min(1, Math.max(0, (t - ENTER_DELAY) / ENTER_TIME))
        art.current.style.transform = `translateY(${110 * (1 - easeOutBack(enter))}%)`
      }
      frame = requestAnimationFrame(draw)
    })
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('pointermove', onMove)
    }
  }, [close])

  // close: the head fills the round frame (her cap to her chin), the thumbs peeking in at the bottom
  const placement = close ? 'absolute left-1/2 top-[3%] w-[128%] -translate-x-1/2' : 'absolute inset-x-0 bottom-0'
  return (
    <div className={`relative ${className}`} aria-hidden>
      <div ref={art} className={placement} style={{ aspectRatio: `${ART.width} / ${ART.height}` }}>
        {LAYERS.map(({ name, pivot, shadow }) => (
          <img
            key={name}
            ref={(element) => void (layers.current[name] = element)}
            src={`${import.meta.env.BASE_URL}images/companion/companion-${name}.webp`}
            alt=""
            draggable={false}
            className={`absolute inset-0 size-full select-none ${shadow ? 'drop-shadow-[0_3px_4px_rgba(0,0,0,0.22)]' : ''}`}
            style={{ transformOrigin: `${(pivot[0] / ART.width) * 100}% ${(pivot[1] / ART.height) * 100}%` }}
          />
        ))}
      </div>
    </div>
  )
}
