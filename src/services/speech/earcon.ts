import { isMuted } from './textToSpeech.ts'

// Two short notes: rising when the companion starts listening, falling when it has heard something.
const TONES = { listen: [660, 880], heard: [880, 660] }
const NOTE_GAP = 0.09
const NOTE_LENGTH = 0.12
const VOLUME = 0.12

let context: AudioContext | undefined

export function earcon(kind: keyof typeof TONES): void {
  if (isMuted() || typeof AudioContext === 'undefined') return
  try {
    context ??= new AudioContext()
    const audio = context
    TONES[kind].forEach((frequency, index) => {
      const at = audio.currentTime + index * NOTE_GAP
      const oscillator = audio.createOscillator()
      const gain = audio.createGain()
      oscillator.frequency.value = frequency
      gain.gain.setValueAtTime(0, at)
      gain.gain.linearRampToValueAtTime(VOLUME, at + 0.01)
      gain.gain.exponentialRampToValueAtTime(0.001, at + NOTE_LENGTH)
      oscillator.connect(gain).connect(audio.destination)
      oscillator.start(at)
      oscillator.stop(at + NOTE_LENGTH + 0.01)
    })
  } catch {
    // The sound is a nicety; the screen shows the same state.
  }
}
