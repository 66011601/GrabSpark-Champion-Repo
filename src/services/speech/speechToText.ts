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

/** Listens for one Thai utterance. onFinal fires once with the whole transcript, then onEnd. */
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
  recognition.continuous = false
  recognition.maxAlternatives = 1
  let finalText = ''
  let errored = false
  recognition.onresult = (event) => {
    let interim = ''
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const result = event.results[i]
      if (result.isFinal) finalText += result[0].transcript
      else interim += result[0].transcript
    }
    if (interim) handlers.onInterim(finalText + interim)
  }
  recognition.onerror = (event) => {
    errored = true
    handlers.onError(toKind(event.error))
  }
  recognition.onend = () => {
    const text = finalText.trim()
    if (text) handlers.onFinal(text)
    else if (!errored) handlers.onError('no-speech') // ended without hearing anything and without an error event
    handlers.onEnd()
  }
  recognition.start()
  return { stop: () => recognition.stop() }
}
