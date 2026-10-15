import { cutAtEndWord, endsWithClosingWord } from '@/ai/commands/endWord.ts'

// Thin wrapper over the browser Web Speech API (Chrome, Edge, Android Chrome support th-TH).
// Types are declared locally so we do not depend on which DOM lib version ships them.

export type RecognitionErrorKind = 'not-allowed' | 'no-speech' | 'unsupported' | 'other'

export interface ListenHandlers {
  onInterim: (text: string) => void
  onFinal: (text: string) => void
  onError: (kind: RecognitionErrorKind) => void
  onEnd: () => void
}

export interface ListenSession {
  stop: () => void
}

interface RecognitionResultLike {
  isFinal: boolean
  0: { transcript: string }
}

interface RecognitionLike {
  lang: string
  interimResults: boolean
  continuous: boolean
  maxAlternatives: number
  onresult: ((event: { resultIndex: number; results: ArrayLike<RecognitionResultLike> }) => void) | null
  onerror: ((event: { error: string }) => void) | null
  onend: (() => void) | null
  start: () => void
  stop: () => void
}

type RecognitionConstructor = new () => RecognitionLike

// How long the merchant may stay quiet before the turn is closed for them: a while to start talking after the tap,
// then two seconds of silence ends the sentence, whatever word it ended with.
export const QUIET_BEFORE_SPEECH_MS = 10_000
export const QUIET_AFTER_SPEECH_MS = 2_000

function getRecognition(): RecognitionConstructor | undefined {
  const w = window as unknown as { SpeechRecognition?: RecognitionConstructor; webkitSpeechRecognition?: RecognitionConstructor }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition
}

export function isSpeechRecognitionSupported(): boolean {
  return getRecognition() !== undefined
}

function toKind(error: string): RecognitionErrorKind {
  if (error === 'not-allowed' || error === 'service-not-allowed') return 'not-allowed'
  return error === 'no-speech' ? 'no-speech' : 'other'
}

/**
 * Listens for one Thai turn. It ends when the merchant says "จ้า" (or ends on a regional closing word such as เจ้า),
 * presses stop, or stays quiet for two seconds. onFinal fires once with the words before "จ้า", then onEnd.
 */
export function startListening(handlers: ListenHandlers): ListenSession {
  const Recognition = getRecognition()
  if (!Recognition) {
    handlers.onError('unsupported')
    handlers.onEnd()
    return { stop: () => {} }
  }
  const recognition = new Recognition()
  recognition.lang = 'th-TH'
  recognition.interimResults = true
  recognition.continuous = true
  recognition.maxAlternatives = 1
  let finalText = ''
  let heard = '' // everything so far, including words the recogniser may still revise
  let closed = false // the merchant said "จ้า"
  let errored = false
  let quiet: ReturnType<typeof setTimeout> | undefined
  const waitForQuiet = (ms: number) => {
    clearTimeout(quiet)
    quiet = setTimeout(() => recognition.stop(), ms)
  }
  recognition.onresult = (event) => {
    if (closed) return
    let interim = ''
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const result = event.results[i]
      if (result.isFinal) finalText += result[0].transcript
      else interim += result[0].transcript
    }
    const turn = cutAtEndWord(finalText + interim)
    heard = turn.text
    if (heard) handlers.onInterim(heard)
    if (turn.ended || (!interim && endsWithClosingWord(finalText))) {
      closed = true
      recognition.stop()
      return
    }
    waitForQuiet(QUIET_AFTER_SPEECH_MS)
  }
  recognition.onerror = (event) => {
    errored = true
    handlers.onError(toKind(event.error))
  }
  recognition.onend = () => {
    clearTimeout(quiet)
    if (heard) handlers.onFinal(heard)
    else if (!errored) handlers.onError('no-speech') // ended without hearing anything and without an error event
    handlers.onEnd()
  }
  recognition.start()
  waitForQuiet(QUIET_BEFORE_SPEECH_MS)
  return { stop: () => recognition.stop() }
}
