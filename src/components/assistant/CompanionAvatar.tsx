import { EyeOff, Loader2, Mic, MicOff } from 'lucide-react'
import { th } from '@/copy/th.ts'
import { MIC_LABELS, type CompanionState, type MicState } from './companionState.ts'

// Under GitHub Pages the app lives at a base path (vite.config.ts), so files in public/ go through BASE_URL.
const FACE = `${import.meta.env.BASE_URL}images/companion/durian-face.webp`

const RING: Record<CompanionState, string> = {
  idle: 'ring-grab',
  listening: 'ring-action',
  processing: 'ring-grab',
  error: 'ring-field',
  private: 'ring-field',
}

function MicBadge({ state, small }: { state: MicState; small: boolean }) {
  const Icon = state === 'processing' ? Loader2 : state === 'error' ? MicOff : Mic
  return (
    <span
      className={`absolute ${small ? '-top-1.5 -left-1.5 size-6' : '-top-1 -left-1 size-8'} flex items-center justify-center rounded-full text-white ring-2 ring-surface ${state === 'error' ? 'bg-ink-muted' : 'bg-action'}`}
      aria-hidden
    >
      <Icon className={`${small ? 'size-4' : 'size-5'} ${state === 'processing' ? 'animate-spin' : ''}`} />
    </span>
  )
}

/**
 * The companion's face. With `onPress` it is the talk button: press to start, press again
 * while listening to stop. Without it, it only keeps the merchant company.
 */
export function CompanionAvatar({
  state = 'idle',
  speaking = false,
  onPress,
  size = 'md',
}: {
  state?: CompanionState
  speaking?: boolean
  onPress?: () => void
  size?: 'md' | 'sm'
}) {
  const face = (
    <>
      {state === 'listening' && <span className="absolute inset-0 animate-listen rounded-full bg-grab" aria-hidden />}
      {speaking && state === 'idle' && <span className="absolute inset-0 animate-speak rounded-full bg-grab" aria-hidden />}
      <img
        src={FACE}
        alt=""
        width={size === 'sm' ? 48 : 72}
        height={size === 'sm' ? 48 : 72}
        className={`relative ${size === 'sm' ? 'size-12 ring-2' : 'size-18 ring-4'} rounded-full object-cover ${RING[state]}`}
      />
      {state === 'private' && (
        <span className="absolute inset-0 flex animate-pop items-center justify-center rounded-full bg-ink/60 text-white" aria-hidden>
          <EyeOff className="size-8" />
        </span>
      )}
      {onPress && state !== 'private' && <MicBadge state={state} small={size === 'sm'} />}
    </>
  )

  if (!onPress) {
    return (
      <div role="img" aria-label={state === 'private' ? th.account.notLooking : th.companion.name} className="relative shrink-0">
        {face}
      </div>
    )
  }

  return (
    <button
      type="button"
      onClick={onPress}
      disabled={state === 'processing'}
      aria-label={state === 'private' ? th.account.notLooking : MIC_LABELS[state]}
      aria-pressed={state === 'listening'}
      className="relative shrink-0 cursor-pointer rounded-full transition-transform focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-action active:scale-95"
    >
      {face}
    </button>
  )
}
