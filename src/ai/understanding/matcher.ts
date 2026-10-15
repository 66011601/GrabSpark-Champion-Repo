import { ngrams } from './features.ts'

/** A training sentence (already `learnable`) and what it means. */
export interface Example {
  text: string
  label: string
}

// Pieces are numbered once per index, and a sentence is two typed arrays (piece numbers, weights): the index is
// built on the merchant's first unknown sentence, and typed arrays build and compare several times faster than maps.
interface Vector {
  label: string
  ids: Int32Array
  weights: Float64Array
  norm: number
}

/** A screen's training sentences as TF-IDF vectors, with the rarity of every piece they contain. */
export interface MatchIndex {
  ids: Map<string, number>
  idf: Float64Array
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

// Calibrated 2026-10-15 on the held-out sentences (bank/metrics.test.ts), each sentence counted once, over sure
// 0.6–0.9, margin 0.1–0.5 and ask 0.2–0.6: the setting that passes both gates with the fewest questions. Measured
// there: right 87.2% central, 87.1% Isan, 86.4% Northern, 87.9% Southern; wrong without asking 0.2%; asks 57.9%.
// Ask 0.3 drops Northern to 81.4%: an unseen paraphrase often shares only a quarter of its pieces with the closest
// training sentence, so the ask line sits low and "unsure" is the common case. Spec D1 §4 started at 0.75 / 0.3 / 0.45.
export const SURE_SCORE = 0.6
export const SURE_MARGIN = 0.1
export const ASK_SCORE = 0.25
/** How many nearest training sentences vote. */
export const K = 5

/** A piece's weight before rarity: a piece said twice counts less than twice. */
const termWeight = (count: number) => (count === 1 ? 1 : 1 + Math.log(count))

/** TF-IDF vectors of the training sentences. Rare pieces weigh more than ones every sentence has. */
export function buildIndex(examples: Example[]): MatchIndex {
  const ids = new Map<string, number>()
  const sentences = examples.map(({ text, label }) => {
    const counts = ngrams(text)
    const own = new Int32Array(counts.size)
    const weights = new Float64Array(counts.size)
    let at = 0
    for (const [piece, count] of counts) {
      let id = ids.get(piece)
      if (id === undefined) {
        id = ids.size
        ids.set(piece, id)
      }
      own[at] = id
      weights[at] = termWeight(count)
      at += 1
    }
    return { label, ids: own, weights }
  })
  const seenIn = new Int32Array(ids.size)
  for (const sentence of sentences) for (const id of sentence.ids) seenIn[id] += 1
  const idf = Float64Array.from(seenIn, (docs) => Math.log((1 + sentences.length) / (1 + docs)) + 1)
  const vectors = sentences.map((sentence) => {
    let sum = 0
    for (let at = 0; at < sentence.ids.length; at += 1) {
      sentence.weights[at] *= idf[sentence.ids[at]]
      sum += sentence.weights[at] * sentence.weights[at]
    }
    return { ...sentence, norm: Math.sqrt(sum) }
  })
  return { ids, idf, vectors }
}

/** What an understood sentence most likely means: the k closest training sentences vote, weighted by closeness. */
export function classify(index: MatchIndex, understood: string, k = K): Match {
  // The sentence as a dense vector over the index's pieces: a piece no training sentence has cannot make two
  // sentences alike, so it is left out.
  const query = new Float64Array(index.idf.length)
  let sum = 0
  for (const [piece, count] of ngrams(understood)) {
    const id = index.ids.get(piece)
    if (id === undefined) continue
    query[id] = termWeight(count) * index.idf[id]
    sum += query[id] * query[id]
  }
  const norm = Math.sqrt(sum)
  const similarity = (vector: Vector) => {
    if (norm === 0 || vector.norm === 0) return 0
    let dot = 0
    for (let at = 0; at < vector.ids.length; at += 1) dot += vector.weights[at] * query[vector.ids[at]]
    return dot / (norm * vector.norm)
  }
  const nearest = index.vectors
    .map((vector) => ({ label: vector.label, similarity: similarity(vector) }))
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
