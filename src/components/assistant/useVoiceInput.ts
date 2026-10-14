import { useCallback, useEffect, useRef, useState } from 'react'
import { cutAtEndWord } from '@/ai/commands/endWord.ts'
import { demoBus } from '@/app/demo/demoBus.ts'
import { th } from '@/copy/th.ts'
import { earcon } from '@/services/speech/earcon.ts'
import { playScripted } from '@/services/speech/scripted.ts'
import { startListening, type ListenSession } from '@/services/speech/speechToText.ts'
import { isSpeaking, stopSpeaking } from '@/services/speech/textToSpeech.ts'
import type { MicState } from './companionState.ts'
import { createTurnGuard } from './turnGuard.ts'

const THINKING_MS = 500
const RESUME_MS = 800

/** true = understood, false = not understood, or the companion's own reply to say instead. */
export type Reply = boolean | string

// The merchant's last turn was spoken, so the companion listens again once it has answered.
// Shared by every screen: a conversation carries on across them.
let handsFree = false

/**
 * One merchant turn at a time, from the mic or a scripted demo line.
 * `interpret` gets the final words and says whether it understood them. It also gets `isCurrent`:
 * after any `await` it must check that, and stop without touching the journey when it is false
 * (the screen was left, the demo was reset, or the merchant has said something newer).
 * With `autoListen`, the screen keeps the conversation going without another tap.
 */
export type Interpret = (text: string, isCurrent: () => boolean) => Reply | Promise<Reply>

export function useVoiceInput(interpret: Interpret, { autoListen = false } = {}) {
  const [mic, setMicState] = useState<MicState>('idle')
  const [transcript, setTranscript] = useState<{ text: string; final: boolean } | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const micNow = useRef<MicState>('idle')
  const session = useRef<ListenSession | null>(null)
  const guard = useRef(createTurnGuard())
  const thinking = useRef<number | undefined>(undefined)
  const resuming = useRef<number | undefined>(undefined)
  const cancelScript = useRef<(() => void) | null>(null)
  const resume = useRef<() => void>(() => {})
  // Screens pass a fresh `interpret` every render; always use the newest one.
  const latestInterpret = useRef(interpret)
  useEffect(() => {
    latestInterpret.current = interpret
  })

  const setMic = useCallback((next: MicState) => {
    micNow.current = next
    setMicState(next)
  }, [])

  // Anything still in flight (thinking timer, scripted line, mic) must not touch the journey after we leave.
  useEffect(() => {
    const turns = guard.current
    turns.mount()
    return () => {
      turns.unmount()
      window.clearTimeout(thinking.current)
      window.clearTimeout(resuming.current)
      cancelScript.current?.()
      session.current?.stop()
    }
  }, [])

  // Every input path (mic, scripted demo line, chip, keyboard) ends here.
  const hear = useCallback(
    (words: string) => {
      if (!guard.current.mounted()) return
      // A scripted or typed line may close with "จ้า" too, just like a spoken one.
      const text = cutAtEndWord(words).text || words
      const isCurrent = guard.current.begin()
      setTranscript({ text, final: true })
      setMic('processing')
      window.clearTimeout(thinking.current)
      thinking.current = window.setTimeout(async () => {
        if (!isCurrent()) return
        // Interpreting may take a moment (looking a place up on the map); a newer turn wins.
        const reply = await Promise.resolve(latestInterpret.current(text, isCurrent)).catch(() => false as const)
        if (!isCurrent()) return
        setNotice(reply === true ? null : reply === false ? th.onboarding.notUnderstood : reply)
        setMic('idle')
        // When the answer changed nothing the companion has nothing to say, so it just listens again.
        resuming.current = window.setTimeout(() => {
          if (!isSpeaking()) resume.current()
        }, RESUME_MS)
      }, THINKING_MS)
    },
    [setMic],
  )

  // `auto`: the companion opened the mic itself, so silence is not worth a complaint.
  const listen = useCallback(
    (auto: boolean) => {
      stopSpeaking()
      window.clearTimeout(resuming.current)
      if (!auto) setNotice(null)
      setTranscript(null)
      setMic('listening')
      earcon('listen')
      session.current = startListening({
        onInterim: (text) => setTranscript({ text, final: false }),
        onFinal: (text) => {
          handsFree = true
          earcon('heard')
          hear(text)
        },
        onError: (kind) => {
          handsFree = false
          if (kind === 'no-speech') {
            setMic('idle')
            if (!auto) setNotice(th.onboarding.notHeard)
            return
          }
          setMic('error')
          setNotice(kind === 'unsupported' ? th.mic.unsupported : th.mic.error)
        },
        onEnd: () => {
          if (micNow.current === 'listening') setMic('idle')
        },
      })
    },
    [hear, setMic],
  )

  useEffect(() => {
    resume.current = () => {
      if (autoListen && handsFree && guard.current.mounted() && micNow.current === 'idle') listen(true)
    }
  })

  /** Closes an open mic and ends the hands-free conversation (a sheet is about to speak over it). */
  const stop = useCallback(() => {
    if (micNow.current !== 'listening') return
    handsFree = false
    session.current?.stop()
  }, [])

  /** Press to talk (this also cuts the companion off mid-sentence); press again to stop. */
  const toggleMic = () => {
    if (micNow.current === 'listening') return stop()
    listen(false)
  }

  /** The companion finished saying its line. */
  const onSpoken = useCallback(() => resume.current(), [])

  useEffect(
    () =>
      demoBus.onSay((text) => {
        stopSpeaking()
        setNotice(null)
        setMic('listening')
        cancelScript.current?.()
        cancelScript.current = playScripted(text, (partial) => setTranscript({ text: partial, final: false }), hear)
      }),
    [hear, setMic],
  )

  return { mic, transcript, notice, setNotice, toggleMic, stop, hear, onSpoken }
}
