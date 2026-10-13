import { Loader2, Mic, MicOff } from 'lucide-react'
import { th } from '@/copy/th.ts'

export type MicState = 'idle' | 'listening' | 'processing' | 'error'

const LABELS: Record<MicState, string> = {
  idle: th.mic.idle,
  listening: th.mic.listening,
  processing: th.mic.processing,
  error: th.mic.error,
}

/** Big round mic. Press to start; press again while listening to stop. */
export function MicButton({ state, onPress, compact = false }: { state: MicState; onPress: () => void; compact?: boolean }) {
  const size = compact ? 'size-14' : 'size-20'
  const icon = compact ? 'size-7' : 'size-9'
  return (
    <div className="flex flex-col items-center gap-1">
      <button
        type="button"
        onClick={onPress}
        disabled={state === 'processing'}
        aria-label={LABELS[state]}
        aria-pressed={state === 'listening'}
        className={`relative flex ${size} items-center justify-center rounded-full text-white shadow-lg transition-transform active:scale-95 ${state === 'error' ? 'bg-ink-muted' : 'bg-action'}`}
      >
        {state === 'listening' && <span className="absolute inset-0 animate-ping rounded-full bg-grab/40" aria-hidden />}
        {state === 'processing' && <Loader2 className={`${icon} animate-spin`} aria-hidden />}
        {state === 'error' && <MicOff className={icon} aria-hidden />}
        {(state === 'idle' || state === 'listening') && <Mic className={icon} aria-hidden />}
      </button>
      {!compact && (
        <span className="text-base text-ink-muted" aria-live="polite">
          {LABELS[state]}
        </span>
      )}
    </div>
  )
}
