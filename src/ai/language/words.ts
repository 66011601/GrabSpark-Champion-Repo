/** A word or a gap (spaces, punctuation) of a sentence, in order. */
export interface Piece {
  text: string
  word: boolean
}

// The browser's own Thai word breaker. Very old browsers lack it; they split on spaces instead.
const segmenter = typeof Intl !== 'undefined' && 'Segmenter' in Intl ? new Intl.Segmenter('th', { granularity: 'word' }) : null

/** The sentence as word and gap pieces. Joining every piece's text gives the sentence back. */
export function splitWords(text: string): Piece[] {
  if (segmenter) return [...segmenter.segment(text)].map((part) => ({ text: part.segment, word: Boolean(part.isWordLike) }))
  return text
    .split(/(\s+)/)
    .filter(Boolean)
    .map((part) => ({ text: part, word: !/^\s+$/.test(part) }))
}

// Called for every word list entry at every piece of every sentence: most texts have no space, so skip the copy.
const SPACE = /\s/
const squash = (text: string) => (SPACE.test(text) ? text.replace(/\s+/g, '') : text)

/**
 * Where `phrase` ends if it starts at piece `from`: the index after its last piece, or -1.
 * A phrase covers whole pieces only (บ่ never matches inside บ่อ). Spaces are ignored on both sides,
 * and a phrase may span several pieces because the breaker splits some dialect words (หรอย → หรอ + ย).
 */
export function phraseEnd(pieces: Piece[], from: number, phrase: string): number {
  const wanted = squash(phrase)
  if (!wanted) return -1
  let joined = ''
  for (let index = from; index < pieces.length; index += 1) {
    joined += squash(pieces[index].text)
    if (joined === wanted) return index + 1
    if (!wanted.startsWith(joined)) return -1
  }
  return -1
}
