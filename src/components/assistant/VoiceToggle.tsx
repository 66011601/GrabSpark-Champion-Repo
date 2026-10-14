import { Volume2, VolumeX } from 'lucide-react'
import { useEffect, useState, useSyncExternalStore } from 'react'
import { th } from '@/copy/th.ts'
import { getThaiVoice, isMuted, onVoicesChanged, setMuted, subscribeVoice } from '@/services/speech/textToSpeech.ts'

/** Turns the companion's voice off and on. On a device that cannot speak Thai it is only a crossed-out speaker. */
export function VoiceToggle() {
  const muted = useSyncExternalStore(subscribeVoice, isMuted)
  const [available, setAvailable] = useState(() => getThaiVoice() !== undefined)
  useEffect(() => onVoicesChanged(() => setAvailable(getThaiVoice() !== undefined)), [])
  if (!available) {
    return (
      <span className="flex size-11 shrink-0 items-center justify-center text-field" title={th.voice.unavailable}>
        <VolumeX className="size-6" aria-hidden />
        <span className="sr-only">{th.voice.unavailable}</span>
      </span>
    )
  }
  const Icon = muted ? VolumeX : Volume2
  return (
    <button
      type="button"
      onClick={() => setMuted(!muted)}
      aria-label={muted ? th.voice.unmute : th.voice.mute}
      aria-pressed={!muted}
      className={`flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-full active:bg-surface ${muted ? 'text-ink-muted' : 'text-action'}`}
    >
      <Icon className="size-6" aria-hidden />
    </button>
  )
}
