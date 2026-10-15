import { toSpeech } from '@/lib/speechText.ts'

const supported = () => typeof window !== 'undefined' && 'speechSynthesis' in window

const MUTE_KEY = 'companion-muted'
// The companion speaks as หนู…ค่ะ, so a woman's Thai voice is used when the device has one.
const PREFERRED_VOICES = ['premwadee', 'achara', 'kanya', 'narisa']

function readMuted(): boolean {
  try {
    return window.localStorage.getItem(MUTE_KEY) === '1'
  } catch {
    return false
  }
}

let muted = typeof window !== 'undefined' && readMuted()
let speaking = false
let turn = 0 // bumps whenever speech is replaced or stopped, so a cut-off line never reports "done"
let waiting: (() => void) | null = null // a line the browser will not play until the first tap
let armed = false
const listeners = new Set<() => void>()

function setSpeaking(next: boolean): void {
  if (speaking === next) return
  speaking = next
  for (const listener of listeners) listener()
}

/** Subscribe to mute and speaking changes (for useSyncExternalStore). */
export function subscribeVoice(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export const isMuted = () => muted
export const isSpeakingNow = () => speaking

export function setMuted(next: boolean): void {
  muted = next
  try {
    window.localStorage.setItem(MUTE_KEY, next ? '1' : '0')
  } catch {
    // Private browsing: the choice just lasts for this visit.
  }
  if (next) stopSpeaking()
  for (const listener of listeners) listener()
}

export function getThaiVoice(): SpeechSynthesisVoice | undefined {
  if (!supported()) return undefined
  const thai = window.speechSynthesis.getVoices().filter((voice) => voice.lang.toLowerCase().startsWith('th'))
  const preferred = PREFERRED_VOICES.map((name) => thai.find((voice) => voice.name.toLowerCase().includes(name)))
  return preferred.find((voice) => voice !== undefined) ?? thai[0]
}

/** Voices load asynchronously in most browsers; subscribe to know when a Thai one appears. */
export function onVoicesChanged(callback: () => void): () => void {
  if (!supported()) return () => {}
  window.speechSynthesis.addEventListener('voiceschanged', callback)
  return () => window.speechSynthesis.removeEventListener('voiceschanged', callback)
}

// Browsers refuse to speak before the first tap or key press; hold the latest line until then.
function whenAllowed(run: () => void): void {
  if (navigator.userActivation?.hasBeenActive ?? true) {
    run()
    return
  }
  waiting = run
  if (armed) return
  armed = true
  const release = () => {
    window.removeEventListener('click', release)
    window.removeEventListener('keydown', release)
    armed = false
    const held = waiting
    waiting = null
    held?.()
  }
  window.addEventListener('click', release)
  window.addEventListener('keydown', release)
}

/**
 * Says a line in Thai, replacing whatever was being said. `onDone` runs when the line finishes,
 * or straight away when the device cannot speak or is muted; it never runs for a line that was cut off.
 */
export function speak(text: string, onDone?: () => void): void {
  stopSpeaking()
  const mine = turn
  const finish = () => {
    if (mine !== turn) return
    setSpeaking(false)
    onDone?.()
  }
  if (muted || !supported()) {
    window.setTimeout(finish, 0)
    return
  }
  // The first line of a visit often comes before the browser has listed its voices: wait for them a moment.
  void voiceReady().then((voice) => {
    if (mine !== turn) return
    if (voice && !muted) say(voice, text, mine, finish)
    else finish()
  })
}

const VOICE_WAIT_MS = 2000

/** The Thai voice, waiting up to VOICE_WAIT_MS for the browser to list its voices. Undefined when the device has none. */
export function voiceReady(): Promise<SpeechSynthesisVoice | undefined> {
  const now = getThaiVoice()
  if (now || !supported()) return Promise.resolve(now)
  return new Promise((resolve) => {
    let unsubscribe = () => {}
    const done = () => {
      window.clearTimeout(timer)
      unsubscribe()
      resolve(getThaiVoice())
    }
    const timer = window.setTimeout(done, VOICE_WAIT_MS)
    unsubscribe = onVoicesChanged(() => {
      if (getThaiVoice()) done()
    })
  })
}

function say(voice: SpeechSynthesisVoice, text: string, mine: number, finish: () => void): void {
  const utterance = new SpeechSynthesisUtterance(toSpeech(text))
  utterance.voice = voice
  utterance.lang = voice.lang
  utterance.rate = 1
  utterance.onstart = () => {
    if (mine === turn) setSpeaking(true)
  }
  utterance.onend = finish
  utterance.onerror = finish
  whenAllowed(() => {
    if (mine === turn) window.speechSynthesis.speak(utterance)
  })
}

export function stopSpeaking(): void {
  turn += 1
  waiting = null
  setSpeaking(false)
  if (supported()) window.speechSynthesis.cancel()
}

/** True while a line is playing or queued. */
export function isSpeaking(): boolean {
  return supported() && (window.speechSynthesis.speaking || window.speechSynthesis.pending)
}
