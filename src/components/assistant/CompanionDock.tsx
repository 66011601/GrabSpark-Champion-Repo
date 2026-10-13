import { AlertCircle, Volume2, VolumeX } from 'lucide-react'
import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from 'react'
import { th } from '@/copy/th.ts'
import {
  getThaiVoice,
  isMuted,
  isSpeakingNow,
  onVoicesChanged,
  setMuted,
  speak,
  stopSpeaking,
  subscribeVoice,
} from '@/services/speech/textToSpeech.ts'
import { CompanionAvatar } from './CompanionAvatar.tsx'
import type { CompanionState } from './companionState.ts'
import { TranscriptBubble } from './TranscriptBubble.tsx'

interface CompanionDockProps {
  text: string
  notice?: string | null // something went wrong; shown above the text, amber, with an icon
  hint?: string // a short line under the text, e.g. what pressing the avatar does
  heard?: { text: string; final: boolean } | null // the merchant's words, for screens with nowhere else to show them
  state?: CompanionState
  onPress?: () => void
  onSpoken?: () => void // the companion finished saying this line aloud
  extras?: ReactNode // answer chips, between the bubble and the bottom row
  actions?: ReactNode // the screen's main button(s), left of the avatar
  bare?: boolean // no top border, for screens that are not scrolled
}

/** Turns the companion's voice off and on. On a device that cannot speak Thai it is only a crossed-out speaker. */
function VoiceToggle() {
  const muted = useSyncExternalStore(subscribeVoice, isMuted)
  const [available, setAvailable] = useState(() => getThaiVoice() !== undefined)
  useEffect(() => onVoicesChanged(() => setAvailable(getThaiVoice() !== undefined)), [])
  if (!available) {
    return (
      <span className="-mt-1 -mr-2 flex size-11 shrink-0 items-center justify-center text-field" title={th.voice.unavailable}>
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
      className={`-mt-1 -mr-2 flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-full active:bg-surface ${muted ? 'text-ink-muted' : 'text-action'}`}
    >
      <Icon className="size-6" aria-hidden />
    </button>
  )
}

function Bubble({ text, notice, hint, tail }: Pick<CompanionDockProps, 'text' | 'notice' | 'hint'> & { tail: 'down' | 'right' }) {
  return (
    <div className="relative flex min-w-0 items-start gap-1 rounded-3xl rounded-br-md bg-ok-bg py-3 pr-3 pl-4">
      <div className="min-w-0 flex-1">
        {notice && (
          <p role="status" className="mb-2 flex items-start gap-2 rounded-2xl bg-warn-bg px-3 py-2 text-base text-warn-ink">
            <AlertCircle className="mt-1 size-5 shrink-0" aria-hidden />
            {notice}
          </p>
        )}
        <p key={text} aria-live="polite" className="animate-rise text-lg">
          <span className="sr-only">{th.companion.name}: </span>
          {text}
        </p>
        {hint && <p className="mt-1 text-sm font-medium text-action">{hint}</p>}
      </div>
      <VoiceToggle />
      <span
        className={`absolute size-4 rotate-45 bg-ok-bg ${tail === 'down' ? 'right-7 -bottom-1.5' : '-right-1.5 bottom-5'}`}
        aria-hidden
      />
    </div>
  )
}

/**
 * The bottom of every screen: what the companion is saying, and the companion itself,
 * always in the bottom-right corner. The screen's main button sits to its left.
 * Each new line is also said aloud in Thai.
 */
export function CompanionDock({ text, notice, hint, heard, state = 'idle', onPress, onSpoken, extras, actions, bare = false }: CompanionDockProps) {
  const speaking = useSyncExternalStore(subscribeVoice, isSpeakingNow)
  const line = notice ? `${notice} ${text}` : text
  const latest = useRef({ state, onSpoken })
  useEffect(() => {
    latest.current = { state, onSpoken }
  })

  useEffect(() => {
    // Never talk over the merchant: the mic would hear the companion's own voice.
    if (latest.current.state !== 'listening') speak(line, () => latest.current.onSpoken?.())
    return stopSpeaking
  }, [line])

  const avatar = <CompanionAvatar state={state} speaking={speaking} onPress={onPress} />
  return (
    <footer className={`flex flex-col gap-3 px-4 pt-3 pb-4 ${bare ? '' : 'border-t border-line bg-surface'}`}>
      {heard && <TranscriptBubble text={heard.text} final={heard.final} />}
      {actions && <Bubble text={text} notice={notice} hint={hint} tail="down" />}
      {extras}
      <div className="flex items-end justify-end gap-3">
        {actions ? <div className="min-w-0 flex-1">{actions}</div> : <Bubble text={text} notice={notice} hint={hint} tail="right" />}
        {avatar}
      </div>
    </footer>
  )
}
