import { stripParticles } from '@/ai/onboarding/parsers/particles.ts'
import { DIALECT, type DialectWord, type Region } from './dialect.ts'
import { RUDE } from './rude.ts'
import { phraseEnd, splitWords, type Piece } from './words.ts'

/** One heard sentence, ready for the screens. */
export interface Understood {
  text: string // what the screens read: central Thai, rude words removed
  shown: string // what the merchant sees: their own words, rude words as ***
  regionWords: Record<Region, number> // region-only words heard (shared words are not counted)
  dialectWords: number // every dialect word heard, shared ones included
  onlyRude: boolean // nothing was said but rude words (and particles)
}

const MASK = '***'
const length = (phrase: string) => phrase.replace(/\s+/g, '').length
// Longest first, so "บ่แม่น" wins over "บ่" and "ไอ้ควาย" over nothing.
const RUDE_WORDS = [...RUDE].sort((a, b) => length(b) - length(a))
const DIALECT_WORDS = [...DIALECT].sort((a, b) => length(b.word) - length(a.word))

function firstMatch<T>(pieces: Piece[], from: number, list: T[], phrase: (item: T) => string): { item: T; end: number } | null {
  for (const item of list) {
    const end = phraseEnd(pieces, from, phrase(item))
    if (end !== -1) return { item, end }
  }
  return null
}

const said = (pieces: Piece[], from: number, end: number) => pieces.slice(from, end).map((piece) => piece.text).join('')

/** The sentence with rude words shown as ***, nothing else changed: for the words appearing live while the merchant talks. */
export function maskRude(text: string): string {
  const pieces = splitWords(text)
  let shown = ''
  for (let index = 0; index < pieces.length; ) {
    const rude = pieces[index].word ? firstMatch(pieces, index, RUDE_WORDS, (word) => word) : null
    shown += rude ? MASK : pieces[index].text
    index = rude ? rude.end : index + 1
  }
  return shown
}

/** Rude words out, dialect function words into central Thai. Pure; the same sentence always gives the same result. */
export function understandThai(input: string): Understood {
  const pieces = splitWords(input)
  const regionWords: Record<Region, number> = { isan: 0, north: 0, south: 0 }
  let shown = ''
  let text = ''
  let rude = 0
  let dialectWords = 0
  const heard: DialectWord[] = []

  for (let index = 0; index < pieces.length; ) {
    const piece = pieces[index]
    const rudeMatch = piece.word ? firstMatch(pieces, index, RUDE_WORDS, (word) => word) : null
    if (rudeMatch) {
      shown += MASK
      text += ' '
      rude += 1
      index = rudeMatch.end
      continue
    }
    const dialect = piece.word ? firstMatch(pieces, index, DIALECT_WORDS, (entry) => entry.word) : null
    if (dialect) {
      const words = said(pieces, index, dialect.end)
      shown += words
      text += dialect.item.central ?? words
      dialectWords += 1
      heard.push(dialect.item)
      if (dialect.item.region !== 'shared') regionWords[dialect.item.region] += 1
      index = dialect.end
      continue
    }
    shown += piece.text
    text += piece.text
    index += 1
  }

  let clean = text.replace(/\s+/g, ' ').trim()
  const left = stripParticles(clean)
  // "เจ้า" on its own is a Northern yes, not an empty sentence.
  if (!left && rude === 0 && heard.length === 1 && heard[0].alone) clean = heard[0].alone
  return { text: clean, shown, regionWords, dialectWords, onlyRude: rude > 0 && !left }
}
