import { useEffect } from 'react'
import { type PoseName, POSES } from './companionPoses.ts'

const src = (pose: PoseName) => `${import.meta.env.BASE_URL}images/companion/poses/${pose}.webp`

// Each pose's own idle motion: a wave wiggles, a jump hops, a heart pulses, the rest sway on their feet.
const IDLE: Record<PoseName, string> = {
  wave: 'animate-wiggle',
  hips: 'animate-sway',
  cheer: 'animate-hop',
  heart: 'animate-pulse-soft',
  bag: 'animate-sway',
  peace: 'animate-wiggle',
}

let preloaded = false
// The first change of pose should not wait for the network.
function preload() {
  if (preloaded) return
  preloaded = true
  for (const pose of Object.keys(POSES) as PoseName[]) new Image().src = src(pose)
}

/**
 * The companion standing behind the phone's bottom edge: she peeks up into view, shown down to about her hips
 * (`POSES[pose].show`); the rest of her is below the box and is cut off by the screen, so place the box on that edge.
 * A new pose pops in, each pose has its own idle motion, and she bobs while she talks. Still with reduced motion.
 */
export function CompanionPose({ pose, speaking, className = '' }: { pose: PoseName; speaking: boolean; className?: string }) {
  const { width, height, show } = POSES[pose]
  useEffect(preload, [])
  return (
    <div className={`relative ${className}`} aria-hidden>
      <div className="absolute inset-0 animate-peek motion-reduce:animate-none">
        <div className={`absolute inset-0 ${speaking ? 'animate-bob' : ''} motion-reduce:animate-none`}>
          <div
            className={`absolute top-0 left-1/2 -translate-x-1/2 origin-bottom ${IDLE[pose]} motion-reduce:animate-none`}
            style={{ height: `${100 / show}%`, aspectRatio: `${width} / ${height}` }}
          >
            <img
              key={pose}
              src={src(pose)}
              alt=""
              draggable={false}
              className="size-full animate-pose-in select-none drop-shadow-[0_4px_6px_rgba(0,0,0,0.25)] motion-reduce:animate-none"
            />
          </div>
        </div>
      </div>
    </div>
  )
}
