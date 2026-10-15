import { ngrams } from './features.ts'

/** A training sentence (already `learnable`) and what it means. */
export interface Example {
  text: string
  label: string
}

interface Vector {
  label: string
  weights: Map<string, number>
  norm: number
}

/** A screen's training sentences as TF-IDF vectors, with the rarity of every piece they contain. */
export interface MatchIndex {
  idf: Map<string, number>
  vectors: Vector[]
}

/** The best label, how close the closest sentence was (cosine 0–1), and how clearly it beat the runner-up. */
export interface Match {
  label: string
  score: number
  margin: number // the best label's share of the vote minus the runner-up's (0–1)
  ranked: string[] // labels by vote, best first
}

/** sure: act now; unsure: ask back; lost: offer buttons. */
export type Level = 'sure' | 'unsure' | 'lost'

// Calibrated 2026-10-15 on the held-out sentences (bank/metrics.test.ts), over sure 0.6–0.9, margin 0.1–0.5 and
// ask 0.3–0.6: the setting that passes both gates with the fewest questions. Measured there: right 90.0% central,
// 89.0% Isan, 89.7% Northern, 87.7% Southern; wrong without asking 0.30%; asks 27.6%. Ask 0.35 already drops Isan and
// Northern under 85% (unseen paraphrases share few character pieces), and the sure line moves only the ask rate.
// Spec D1 §4 started at 0.75 / 0.3 / 0.45.
export const SURE_SCORE = 0.6
export const SURE_MARGIN = 0.1
export const ASK_SCORE = 0.3
/** How many nearest training sentences vote. */
export const K = 5

function weigh(counts: Map<string, number>, idf: Map<string, number>, label: string): Vector {
  const weights = new Map<string, number>()
  let sum = 0
  for (const [gram, count] of counts) {
    const rarity = idf.get(gram)
    if (rarity === undefined) continue // a piece no training sentence has cannot make two sentences alike
    const weight = (1 + Math.log(count)) * rarity
    weights.set(gram, weight)
    sum += weight * weight
  }
  return { label, weights, norm: Math.sqrt(sum) }
}

/** TF-IDF vectors of the training sentences. Rare pieces weigh more than ones every sentence has. */
export function buildIndex(examples: Example[]): MatchIndex {
  const counted = examples.map((example) => ({ label: example.label, counts: ngrams(example.text) }))
  const idf = new Map<string, number>()
  for (const { counts } of counted) for (const gram of counts.keys()) idf.set(gram, (idf.get(gram) ?? 0) + 1)
  const total = counted.length
  for (const [gram, docs] of idf) idf.set(gram, Math.log((1 + total) / (1 + docs)) + 1)
  // Every training piece is in the idf, so each sentence's counts become its weights in place: the index is built on
  // the merchant's first unknown sentence, and a second map per sentence was a third of the time.
  const vectors = counted.map(({ label, counts }) => {
    let sum = 0
    for (const [gram, count] of counts) {
      const weight = (count === 1 ? 1 : 1 + Math.log(count)) * idf.get(gram)!
      counts.set(gram, weight)
      sum += weight * weight
    }
    return { label, weights: counts, norm: Math.sqrt(sum) }
  })
  return { idf, vectors }
}

function cosine(a: Vector, b: Vector): number {
  if (a.norm === 0 || b.norm === 0) return 0
  const [small, large] = a.weights.size <= b.weights.size ? [a, b] : [b, a]
  let dot = 0
  for (const [gram, weight] of small.weights) dot += weight * (large.weights.get(gram) ?? 0)
  return dot / (a.norm * b.norm)
}

/** What an understood sentence most likely means: the k closest training sentences vote, weighted by closeness. */
export function classify(index: MatchIndex, understood: string, k = K): Match {
  const query = weigh(ngrams(understood), index.idf, '')
  const nearest = index.vectors
    .map((vector) => ({ label: vector.label, similarity: cosine(query, vector) }))
    .filter((near) => near.similarity > 0)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, k)
  if (nearest.length === 0) return { label: 'none', score: 0, margin: 0, ranked: [] }
  const votes = new Map<string, number>()
  for (const near of nearest) votes.set(near.label, (votes.get(near.label) ?? 0) + near.similarity)
  const ranked = [...votes.entries()].sort((a, b) => b[1] - a[1]).map(([label]) => label)
  const total = [...votes.values()].reduce((sum, vote) => sum + vote, 0)
  const best = ranked[0]
  const second = ranked[1] ? votes.get(ranked[1])! : 0
  const score = Math.max(...nearest.filter((near) => near.label === best).map((near) => near.similarity))
  return { label: best, score, margin: (votes.get(best)! - second) / total, ranked }
}

/** sure: act; unsure: ask back; lost: offer buttons. "none" is always lost. */
export function levelOf(match: Match): Level {
  if (match.label === 'none' || match.score < ASK_SCORE) return 'lost'
  return match.score >= SURE_SCORE && match.margin >= SURE_MARGIN ? 'sure' : 'unsure'
}
