import { toSpeech } from '@/lib/speechText.ts'
import { clipsFor, clipUrl, loadVoice, noteSpoken } from './voiceClips.ts'

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
  hold(run)
}

/** Runs `run` on the next tap or key press, inside it, so the browser lets it make sound. */
function hold(run: () => void): void {
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
 * Says a line in Thai, replacing whatever was being said: in the companion's recorded voice when the line was
 * recorded (the same on every device), otherwise in the device's own Thai voice. `onDone` runs when the line
 * finishes, or straight away when nothing can say it or the voice is muted; it never runs for a line that was cut off.
 */
export function speak(text: string, onDone?: () => void): void {
  stopSpeaking()
  noteSpoken(text)
  const mine = turn
  const finish = () => {
    if (mine !== turn) return
    setSpeaking(false)
    onDone?.()
  }
  if (muted) {
    window.setTimeout(finish, 0)
    return
  }
  const byDevice = () => {
    if (!supported()) return finish()
    // The first line of a visit often comes before the browser has listed its voices: wait for them a moment.
    void voiceReady().then((voice) => {
      if (mine !== turn) return
      if (voice && !muted) say(voice, text, mine, finish)
      else finish()
    })
  }
  void loadVoice().then((recorded) => {
    if (mine !== turn) return
    const clips = recorded && clipsFor(text, recorded.lines)
    if (clips) play(clips, recorded.playbackRate, mine, finish, byDevice)
    else byDevice()
  })
}

// One audio element for every recording: a phone lets a page play sound only after a tap, and the element the
// first tap started may play again later without one.
let player: HTMLAudioElement | null = null

/** Plays the recordings one after another. A recording that will not load hands the whole line to the device voice. */
function play(clips: string[], rate: number, mine: number, finish: () => void, instead: () => void): void {
  player ??= new Audio()
  const audio = player
  // Faster without keeping the pitch: her voice comes out higher, like the little girl she is.
  const pitch = audio as HTMLAudioElement & { webkitPreservesPitch?: boolean; mozPreservesPitch?: boolean }
  pitch.preservesPitch = false
  pitch.webkitPreservesPitch = false
  pitch.mozPreservesPitch = false
  audio.defaultPlaybackRate = rate
  let index = 0
  const next = () => {
    if (mine !== turn) return
    if (index >= clips.length) return finish()
    audio.src = clipUrl(clips[index])
    audio.playbackRate = rate
    index += 1
    whenAllowed(() => {
      if (mine !== turn) return
      audio.play().then(
        () => mine === turn && setSpeaking(true),
        (error: unknown) => {
          if (mine !== turn) return
          // Not allowed yet (no tap so far): wait for one. Anything else: let the device say it.
          if (error instanceof DOMException && error.name === 'NotAllowedError') hold(() => void audio.play().catch(instead))
          else instead()
        },
      )
    })
  }
  audio.onended = next
  // A load cut short by the next recording (MEDIA_ERR_ABORTED) is not a failure.
  audio.onerror = () => {
    if (mine === turn && audio.error && audio.error.code !== MediaError.MEDIA_ERR_ABORTED) instead()
  }
  next()
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
  // A little higher than the device's own voice, closer to the recorded little girl.
  utterance.rate = 1.05
  utterance.pitch = 1.3
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
  if (player) {
    player.onended = null
    player.onerror = null
    player.pause()
  }
  if (supported()) window.speechSynthesis.cancel()
}

/** True while a line is playing or queued. */
export function isSpeaking(): boolean {
  if (player && !player.paused && !player.ended) return true
  return supported() && (window.speechSynthesis.speaking || window.speechSynthesis.pending)
}
