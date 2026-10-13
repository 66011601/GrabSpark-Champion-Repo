const supported = () => typeof window !== 'undefined' && 'speechSynthesis' in window

export function getThaiVoice(): SpeechSynthesisVoice | undefined {
  if (!supported()) return undefined
  return window.speechSynthesis.getVoices().find((voice) => voice.lang.toLowerCase().startsWith('th'))
}

/** Voices load asynchronously in most browsers; subscribe to know when a Thai one appears. */
export function onVoicesChanged(callback: () => void): () => void {
  if (!supported()) return () => {}
  window.speechSynthesis.addEventListener('voiceschanged', callback)
  return () => window.speechSynthesis.removeEventListener('voiceschanged', callback)
}

export function speak(text: string): void {
  const voice = getThaiVoice()
  if (!voice) return
  window.speechSynthesis.cancel()
  const utterance = new SpeechSynthesisUtterance(text)
  utterance.voice = voice
  utterance.lang = voice.lang
  utterance.rate = 0.95
  window.speechSynthesis.speak(utterance)
}

export function stopSpeaking(): void {
  if (supported()) window.speechSynthesis.cancel()
}
