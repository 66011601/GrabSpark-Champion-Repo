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

export type Level = 'sure' | 'unsure' | 'lost'

// Initial values from the spec; Task 7 calibrates them on the held-out sentences and updates these lines.
export const SURE_SCORE = 0.75
export const SURE_MARGIN = 0.3
export const ASK_SCORE = 0.45
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
  const seenIn = new Map<string, number>()
  for (const { counts } of counted) for (const gram of counts.keys()) seenIn.set(gram, (seenIn.get(gram) ?? 0) + 1)
  const total = counted.length
  const idf = new Map([...seenIn].map(([gram, docs]) => [gram, Math.log((1 + total) / (1 + docs)) + 1]))
  return { idf, vectors: counted.map(({ label, counts }) => weigh(counts, idf, label)) }
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
