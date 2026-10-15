import { Camera, Mic } from 'lucide-react'
import { useEffect, useState, useSyncExternalStore } from 'react'
import { CompanionAvatar } from '@/components/assistant/CompanionAvatar.tsx'
import type { Choice, CompanionState } from '@/components/assistant/companionState.ts'
import { Spotlight } from '@/components/assistant/Spotlight.tsx'
import { markSeen, shouldSpotlight } from '@/components/assistant/spotlight.ts'
import { useSpokenLine } from '@/components/assistant/useSpokenLine.ts'
import { VoiceToggle } from '@/components/assistant/VoiceToggle.tsx'
import { th } from '@/copy/th.ts'
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

/** The slim "ผู้ช่วย AI" bar above the screen's green button. */
export function AiHelperBar({ text, notice, mic, onAvatar, action, onSpoken, choices }: AiHelperBarProps) {
  const speaking = useSyncExternalStore(subscribeVoice, isSpeakingNow)
  useSpokenLine(notice ? `${notice} ${text}` : text, { listening: mic === 'listening', onSpoken })
  const Icon = action?.kind === 'camera' ? Camera : Mic
  // A new step opens with its advice in the spotlight: the page dims and the 3D companion says it.
  // Once the companion says something else, the merchant has moved on, so the page comes back by itself.
  const [spotlight, setSpotlight] = useState(() => shouldSpotlight(text))
  const [firstLine] = useState(text)
  useEffect(() => markSeen(firstLine), [firstLine])
  if (spotlight && (text !== firstLine || notice)) setSpotlight(false)
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-ok-bg p-2 pr-2">
      {spotlight && <Spotlight text={text} speaking={speaking} onClose={() => setSpotlight(false)} />}
      <CompanionAvatar size="sm" state={mic} speaking={speaking} onPress={onAvatar} />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold text-action">{th.grab.aiHelper}</p>
        {notice && (
          <p role="status" className="text-base text-warn-ink">
            {notice}
          </p>
        )}
        <p key={text} aria-live="polite" className="animate-rise text-base leading-snug">
          {text}
        </p>
        {choices && choices.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2">
            {choices.map((choice) => (
              <button
                key={choice.id}
                type="button"
                onClick={choice.onPress}
                className="min-h-12 cursor-pointer rounded-full bg-surface px-4 text-base font-medium text-action ring-1 ring-action active:bg-ok-bg"
              >
                {choice.label}
              </button>
            ))}
          </div>
        )}
      </div>
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
    </div>
  )
}
