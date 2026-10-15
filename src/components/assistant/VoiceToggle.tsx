import { Volume2, VolumeX } from 'lucide-react'
import { useEffect, useState, useSyncExternalStore } from 'react'
import { th } from '@/copy/th.ts'
import { getThaiVoice, isMuted, onVoicesChanged, setMuted, subscribeVoice, voiceReady } from '@/services/speech/textToSpeech.ts'

/**
 * Turns the companion's voice off and on. It is always a button: on a device that cannot speak Thai (yet) a tap
 * looks for the voice again and, when there is none, says why there is no sound and what to do.
 */
export function VoiceToggle() {
  const muted = useSyncExternalStore(subscribeVoice, isMuted)
  const [available, setAvailable] = useState(() => getThaiVoice() !== undefined)
  const [hint, setHint] = useState(false)
  // Voices are listed late, and the event can fire before this screen subscribes: look once more after mounting.
  useEffect(() => {
    let current = true
    void voiceReady().then((voice) => {
      if (current) setAvailable(voice !== undefined)
    })
    const unsubscribe = onVoicesChanged(() => setAvailable(getThaiVoice() !== undefined))
    return () => {
      current = false
      unsubscribe()
    }
  }, [])
  const press = () => {
    if (available) return setMuted(!muted)
    const found = getThaiVoice() !== undefined
    setAvailable(found)
    setHint(!found)
    if (found) setMuted(false)
  }
  const off = muted || !available
  const Icon = off ? VolumeX : Volume2
  return (
    <span className="relative flex shrink-0">
      <button
        type="button"
        onClick={press}
        aria-label={!available ? th.voice.unavailable : muted ? th.voice.unmute : th.voice.mute}
        aria-pressed={available ? !muted : undefined}
        title={!available ? th.voice.unavailable : undefined}
        className={`flex size-12 cursor-pointer items-center justify-center rounded-full active:bg-surface ${off ? 'text-ink-muted' : 'text-action'}`}
      >
        <Icon className="size-6" aria-hidden />
      </button>
      {hint && (
        <span role="status" className="absolute right-0 bottom-14 z-20 w-60 rounded-xl bg-ink p-3 text-sm text-white shadow-lg">
          {th.voice.howToHear}
          <button type="button" onClick={() => setHint(false)} className="mt-2 block min-h-12 w-full cursor-pointer rounded-lg bg-surface font-bold text-ink">
            {th.voice.gotIt}
          </button>
        </span>
      )}
    </span>
  )
}
