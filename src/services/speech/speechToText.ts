import { cutAtEndWord, endsWithClosingWord } from '@/ai/commands/endWord.ts'

// Thin wrapper over the browser Web Speech API (Chrome, Edge, Android Chrome support th-TH).
// Types are declared locally so we do not depend on which DOM lib version ships them.

export type RecognitionErrorKind = 'not-allowed' | 'no-speech' | 'unsupported' | 'other'

export interface ListenHandlers {
  onInterim: (text: string) => void
  /** The words heard, and the recogniser's other guesses for them (whole sentences, best first). */
  onFinal: (text: string, alternatives: string[]) => void
  onError: (kind: RecognitionErrorKind) => void
  onEnd: () => void
}

export interface ListenSession {
  stop: () => void
}

interface RecognitionResultLike {
  isFinal: boolean
  length?: number // how many guesses; 1 when missing
  [guess: number]: { transcript: string }
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

// The recogniser's guesses for one finished stretch of speech, best first. Up to this many are asked for, so the
// screens can try a second guess when the first is not understood.
const GUESSES = 3

/** One finished stretch of speech: the recogniser's guesses, best first. */
export type Stretch = string[]

const bare = (text: string) => text.replace(/\s+/g, '')

/**
 * Adds a finished stretch. Android Chrome sometimes sends one again, or a new one that repeats everything before it:
 * a repeat is dropped, and a stretch that holds all the ones before it replaces them.
 */
export function addStretch(stretches: Stretch[], next: Stretch): Stretch[] {
  const said = bare(next[0] ?? '')
  if (!said) return stretches
  const before = bare(stretches.map((stretch) => stretch[0]).join(''))
  if (before && said.startsWith(before)) return [next]
  if (before.endsWith(said)) return stretches
  return [...stretches, next]
}

/** The other whole sentences the recogniser might have meant: each takes one stretch's next guess, the rest stay. */
export function otherGuesses(stretches: Stretch[]): string[] {
  const best = stretches.map((stretch) => stretch[0])
  const others = stretches.flatMap((stretch, at) => stretch.slice(1).map((guess) => best.map((word, index) => (index === at ? guess : word)).join('')))
  return others.slice(0, GUESSES - 1)
}

const guessesOf = (result: RecognitionResultLike): Stretch =>
  Array.from({ length: result.length ?? 1 }, (_, index) => result[index]?.transcript ?? '').filter((guess) => guess.trim() !== '')

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
  recognition.maxAlternatives = GUESSES
  let stretches: Stretch[] = []
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
      if (result.isFinal) stretches = addStretch(stretches, guessesOf(result))
      else interim += result[0].transcript
    }
    const finalText = stretches.map((stretch) => stretch[0]).join('')
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
    if (heard) {
      const others = otherGuesses(stretches).map((guess) => cutAtEndWord(guess).text)
      handlers.onFinal(heard, [...new Set(others)].filter((guess) => guess !== '' && guess !== heard))
    }
    else if (!errored) handlers.onError('no-speech') // ended without hearing anything and without an error event
    handlers.onEnd()
  }
  recognition.start()
  waitForQuiet(QUIET_BEFORE_SPEECH_MS)
  return { stop: () => recognition.stop() }
}
