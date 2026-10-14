import { useEffect, useRef } from 'react'
import { speak, stopSpeaking } from '@/services/speech/textToSpeech.ts'

/** Says `line` aloud each time it changes. It never talks over the merchant: the mic would hear it. */
export function useSpokenLine(line: string, { listening, onSpoken }: { listening: boolean; onSpoken?: () => void }): void {
  const latest = useRef({ listening, onSpoken })
  useEffect(() => {
    latest.current = { listening, onSpoken }
  })
  useEffect(() => {
    if (!line) return // nothing to say (e.g. a closed sheet): leave whatever is playing alone
    if (!latest.current.listening) speak(line, () => latest.current.onSpoken?.())
    return stopSpeaking
  }, [line])
}
