import { EyeOff, Loader2, Mic, MicOff } from 'lucide-react'
import { th } from '@/copy/th.ts'
import { MIC_LABELS, type CompanionState, type MicState } from './companionState.ts'

const FACE = '/images/companion/durian-face.webp'

const RING: Record<CompanionState, string> = {
  idle: 'ring-grab',
  listening: 'ring-action',
  processing: 'ring-grab',
  error: 'ring-field',
  private: 'ring-field',
}

function MicBadge({ state }: { state: MicState }) {
  const Icon = state === 'processing' ? Loader2 : state === 'error' ? MicOff : Mic
  return (
    <span
      className={`absolute -top-1 -left-1 flex size-8 items-center justify-center rounded-full text-white ring-2 ring-surface ${state === 'error' ? 'bg-ink-muted' : 'bg-action'}`}
      aria-hidden
    >
      <Icon className={`size-5 ${state === 'processing' ? 'animate-spin' : ''}`} />
    </span>
  )
}

/**
 * The companion's face. With `onPress` it is the talk button: press to start, press again
 * while listening to stop. Without it, it only keeps the merchant company.
 */
export function CompanionAvatar({ state = 'idle', onPress }: { state?: CompanionState; onPress?: () => void }) {
  const face = (
    <>
      {state === 'listening' && <span className="absolute inset-0 animate-listen rounded-full bg-grab" aria-hidden />}
      <img src={FACE} alt="" width={72} height={72} className={`relative size-18 rounded-full object-cover ring-4 ${RING[state]}`} />
      {state === 'private' && (
        <span className="absolute inset-0 flex animate-pop items-center justify-center rounded-full bg-ink/60 text-white" aria-hidden>
          <EyeOff className="size-8" />
        </span>
      )}
      {onPress && state !== 'private' && <MicBadge state={state} />}
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
