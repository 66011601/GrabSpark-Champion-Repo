import { useEffect, useRef, useState } from 'react'
import type { DurianStage } from './avatar3d/durianScene.ts'

const FACE = `${import.meta.env.BASE_URL}images/companion/durian-face.webp`

/**
 * The companion in 3D. three.js is loaded only when this first shows, so the rest of the app stays light.
 * Until it is ready, or where WebGL is missing, the photo stands in.
 */
export function Avatar3D({ speaking, className = '' }: { speaking: boolean; className?: string }) {
  const canvas = useRef<HTMLCanvasElement>(null)
  const talking = useRef(speaking)
  const [state, setState] = useState<'loading' | 'ready' | 'failed'>('loading')

  useEffect(() => {
    talking.current = speaking
  }, [speaking])

  useEffect(() => {
    let alive = true
    let stage: DurianStage | null = null
    import('./avatar3d/durianScene.ts')
      .then(({ mountDurian }) => {
        if (!alive || !canvas.current) return
        stage = mountDurian(canvas.current, { speaking: () => talking.current, reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches })
        setState('ready')
      })
      .catch(() => alive && setState('failed'))
    return () => {
      alive = false
      stage?.dispose()
    }
  }, [])

  return (
    <div className={`relative ${className}`} aria-hidden>
      <canvas ref={canvas} className={`size-full ${state === 'ready' ? '' : 'invisible'}`} />
      {state !== 'ready' && <img src={FACE} alt="" className="absolute bottom-6 left-1/2 size-28 -translate-x-1/2 rounded-full object-cover ring-4 ring-grab" />}
    </div>
  )
}
