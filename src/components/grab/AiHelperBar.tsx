import { Camera, Mic } from 'lucide-react'
import { useEffect, useState, useSyncExternalStore } from 'react'
import { CompanionAvatar } from '@/components/assistant/CompanionAvatar.tsx'
import type { Choice, CompanionState } from '@/components/assistant/companionState.ts'
import { Spotlight } from '@/components/assistant/Spotlight.tsx'
import { markSeen, shouldSpotlight } from '@/components/assistant/spotlight.ts'
import { useSpokenLine } from '@/components/assistant/useSpokenLine.ts'
import { VoiceToggle } from '@/components/assistant/VoiceToggle.tsx'
import { isSpeakingNow, subscribeVoice } from '@/services/speech/textToSpeech.ts'

interface AiHelperBarProps {
  text: string // what the companion offers here; said aloud each time it changes
  notice?: string | null // something to fix, said first and shown amber
  mic: CompanionState
  onAvatar?: () => void // the face is the talk button
  action?: { kind: 'mic' | 'camera'; label: string; onPress: () => void } | null
  onSpoken?: () => void
  choices?: Choice[] // yes / no, or the best guesses, while the companion waits for the merchant to pick
}

/**
 * The companion above the screen's green button: her 3D face (the talk button), the voice switch and the screen's own action.
 * What she says shows in the spotlight: on a new step, and whenever she has something to fix or a question to pick from.
 */
export function AiHelperBar({ text, notice, mic, onAvatar, action, onSpoken, choices = [] }: AiHelperBarProps) {
  const speaking = useSyncExternalStore(subscribeVoice, isSpeakingNow)
  useSpokenLine(notice ? `${notice} ${text}` : text, { listening: mic === 'listening', onSpoken })
  const Icon = action?.kind === 'camera' ? Camera : Mic
  const asks = notice || choices.length ? `${notice ?? ''}|${choices.map((choice) => choice.id).join()}` : ''
  const [spotlight, setSpotlight] = useState(() => shouldSpotlight(text) || asks !== '')
  const [firstLine] = useState(text)
  useEffect(() => markSeen(firstLine), [firstLine])
  // A new line alone means the merchant moved on (a voice run walks the page), so the page comes back;
  // something to fix or pick from opens the spotlight again.
  const [shown, setShown] = useState({ text, asks })
  if (shown.text !== text || shown.asks !== asks) {
    setShown({ text, asks })
    setSpotlight(asks !== '')
  }
  const talk = onAvatar && mic !== 'private' ? () => (setSpotlight(false), onAvatar()) : undefined
  return (
    <div className="flex items-center justify-end gap-2">
      {spotlight && <Spotlight text={text} notice={notice} choices={choices} speaking={speaking} onTalk={talk} onClose={() => setSpotlight(false)} />}
      <p aria-live="polite" className="sr-only">
        {notice ? `${notice} ${text}` : text}
      </p>
      <VoiceToggle />
      {action && (
        <button
          type="button"
          onClick={action.onPress}
          aria-label={action.label}
          className="flex size-12 shrink-0 cursor-pointer items-center justify-center rounded-full bg-action text-white active:bg-action-pressed"
        >
          <Icon className="size-6" aria-hidden />
        </button>
      )}
      <CompanionAvatar size="sm" state={mic} speaking={speaking && !spotlight} onPress={onAvatar} />
    </div>
  )
}
