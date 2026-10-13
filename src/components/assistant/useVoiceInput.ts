import { useCallback, useEffect, useRef, useState } from 'react'
import { demoBus } from '@/app/demo/demoBus.ts'
import { th } from '@/copy/th.ts'
import { playScripted } from '@/services/speech/scripted.ts'
import { startListening, type ListenSession } from '@/services/speech/speechToText.ts'
import type { MicState } from './companionState.ts'

const THINKING_MS = 500

/**
 * One merchant turn at a time, from the mic or a scripted demo line.
 * `interpret` gets the final words and says whether it understood them.
 */
export function useVoiceInput(interpret: (text: string) => boolean) {
  const [mic, setMic] = useState<MicState>('idle')
  const [transcript, setTranscript] = useState<{ text: string; final: boolean } | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const session = useRef<ListenSession | null>(null)
  const mounted = useRef(true)
  const thinking = useRef<number | undefined>(undefined)
  const cancelScript = useRef<(() => void) | null>(null)

  // Anything still in flight (thinking timer, scripted line, mic) must not touch the journey after we leave.
  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
      window.clearTimeout(thinking.current)
      cancelScript.current?.()
      session.current?.stop()
    }
  }, [])

  // Every input path (mic, scripted demo line, chip, keyboard) ends here.
  const hear = useCallback(
    (text: string) => {
      if (!mounted.current) return
      setTranscript({ text, final: true })
      setMic('processing')
      window.clearTimeout(thinking.current)
      thinking.current = window.setTimeout(() => {
        if (!mounted.current) return
        setNotice(interpret(text) ? null : th.onboarding.notUnderstood)
        setMic('idle')
      }, THINKING_MS)
    },
    [interpret],
  )

  const toggleMic = () => {
    if (mic === 'listening') {
      session.current?.stop()
      return
    }
    setNotice(null)
    setTranscript(null)
    setMic('listening')
    session.current = startListening({
      onInterim: (text) => setTranscript({ text, final: false }),
      onFinal: hear,
      onError: (kind) => {
        if (kind === 'no-speech') {
          setMic('idle')
          setNotice(th.onboarding.notHeard)
          return
        }
        setMic('error')
        setNotice(kind === 'unsupported' ? th.mic.unsupported : th.mic.error)
      },
      onEnd: () => setMic((current) => (current === 'listening' ? 'idle' : current)),
    })
  }

  useEffect(
    () =>
      demoBus.onSay((text) => {
        setNotice(null)
        setMic('listening')
        cancelScript.current?.()
        cancelScript.current = playScripted(text, (partial) => setTranscript({ text: partial, final: false }), hear)
      }),
    [hear],
  )

  return { mic, transcript, notice, setNotice, toggleMic, hear }
}
