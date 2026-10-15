import { understandThai } from '@/ai/language/understand.ts'
import { stripParticles } from '@/ai/onboarding/parsers/particles.ts'

const N_MIN = 2
const N_MAX = 4

/** Understood text as the matcher compares it: no particles, lower case, no spaces (Thai has none between words anyway). */
export const prepare = (text: string): string => stripParticles(text).toLowerCase().replace(/\s+/g, '')

/** A bank sentence, in any region's words, as the matcher learns it: through the same language layer as speech. */
export const learnable = (say: string): string => prepare(understandThai(say).text)

/** Counts of every 2- to 4-character piece. Character pieces need no word breaker and survive small misspellings. */
export function ngrams(text: string): Map<string, number> {
  const counts = new Map<string, number>()
  if (text.length < N_MIN) {
    if (text) counts.set(text, 1)
    return counts
  }
  for (let size = N_MIN; size <= N_MAX; size += 1) {
    for (let start = 0; start + size <= text.length; start += 1) {
      const gram = text.slice(start, start + size)
      counts.set(gram, (counts.get(gram) ?? 0) + 1)
    }
  }
  return counts
}
