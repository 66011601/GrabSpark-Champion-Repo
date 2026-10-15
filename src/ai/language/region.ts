import type { Region } from './dialect.ts'

// One merchant per page: once the region is sure it stays for the session (a reload starts fresh).
const SURE_IN_ONE_SENTENCE = 2
const SURE_AFTER_SENTENCES = 2
let sure: Region | null = null
const sentences: Record<Region, number> = { isan: 0, north: 0, south: 0 }

/**
 * Notes the region words of one sentence. Returns the region only at the moment it becomes sure:
 * two region-only words in one sentence, or the same region in two sentences. Mixed signals wait.
 */
export function noteRegion(words: Record<Region, number>): Region | null {
  if (sure) return null
  const ranked = (Object.entries(words) as [Region, number][]).filter(([, count]) => count > 0).sort((a, b) => b[1] - a[1])
  if (ranked.length === 0 || (ranked.length > 1 && ranked[0][1] === ranked[1][1])) return null
  const [region, count] = ranked[0]
  sentences[region] += 1
  if (count < SURE_IN_ONE_SENTENCE && sentences[region] < SURE_AFTER_SENTENCES) return null
  sure = region
  return region
}

export const regionNow = (): Region | null => sure

/** For tests. */
export function resetRegion(): void {
  sure = null
  sentences.isan = 0
  sentences.north = 0
  sentences.south = 0
}
