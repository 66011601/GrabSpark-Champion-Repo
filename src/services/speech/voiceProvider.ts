import { getThaiVoice, speak, stopSpeaking } from './textToSpeech.ts'

/** What the companion needs from a voice. The browser is the default; a recorded-voice provider could replace it later. */
export interface VoiceProvider {
  speak(text: string, onDone?: () => void): void
  stop(): void
  isSupported(): boolean
}

export const browserVoice: VoiceProvider = {
  speak,
  stop: stopSpeaking,
  isSupported: () => getThaiVoice() !== undefined,
}

export const voice: VoiceProvider = browserVoice
