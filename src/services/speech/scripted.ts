function toWords(text: string): string[] {
  const segmenter = new Intl.Segmenter('th', { granularity: 'word' })
  return Array.from(segmenter.segment(text), (segment) => segment.segment)
}

/**
 * Plays a line as if speech recognition were hearing it word by word: the demo-safe
 * fallback for noisy rooms and browsers without a mic. Returns a cancel function.
 */
export function playScripted(text: string, onInterim: (partial: string) => void, onFinal: (text: string) => void, durationMs = 1500): () => void {
  const words = toWords(text)
  let shown = 0
  const timer = setInterval(() => {
    shown += 1
    if (shown >= words.length) {
      clearInterval(timer)
      onFinal(text)
    } else {
      onInterim(words.slice(0, shown).join(''))
    }
  }, durationMs / Math.max(words.length, 1))
  return () => clearInterval(timer)
}
