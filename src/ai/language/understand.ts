import { stripParticles } from '@/ai/onboarding/parsers/particles.ts'
import { CENTRAL_WORDS, DIALECT, type DialectWord, type Region } from './dialect.ts'
import { INTERJECTIONS, NOT_RUDE, RUDE } from './rude.ts'
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
const KEPT_WORDS = [...CENTRAL_WORDS].sort((a, b) => length(b) - length(a))
// Words the breaker may glue to the next one: rude words, and dialect verbs, question words and pronouns of three or
// more letters. Particles and two-letter words (บ่, แล) start too many central words (บ่น, แล้ว) to be split off.
const GLUE_KINDS: DialectWord['kind'][] = ['verb', 'question', 'pronoun']
const KNOWN_WORDS = [
  ...RUDE_WORDS,
  ...DIALECT.filter((entry) => GLUE_KINDS.includes(entry.kind) && length(entry.word) >= 3).map((entry) => entry.word),
].sort((a, b) => length(b) - length(a))
// The same words by first letter, longest first within each: unglueKnownWords looks them up at every piece.
const KNOWN_BY_LETTER = new Map<string, string[]>()
for (const word of KNOWN_WORDS) KNOWN_BY_LETTER.set(word.charAt(0), [...(KNOWN_BY_LETTER.get(word.charAt(0)) ?? []), word])
// A Thai word starts with a consonant or a leading vowel, never with a tone mark or a following vowel.
const WORD_START = /^[ก-ฮเแโใไ]/
// Words that start with a rude or dialect word and are neither (กูเกิล, ศาลเจ้า): nothing is matched where they start.
const SAFE_WORDS = [...NOT_RUDE, ...CENTRAL_WORDS]
// Closing particles the word breaker may glue to the word before them, because it does not know the dialect word
// ("…ต้นตาลพุ้นเด้อ" comes out as "พุ้นเด้อ"). Two-letter ones (ก่) are left out: แก่ ends with the same letters.
const GLUED_PARTICLES = DIALECT.filter((entry) => entry.kind === 'particle' && length(entry.word) >= 3).map((entry) => entry.word)
// What may follow a particle that closes a phrase: a polite ending, another particle or an exclamation ("…เจ้าคะ", "…เจ้าเน้อ").
const POLITE_ENDINGS = ['นะคะ', 'นะครับ', 'ค่ะ', 'คะ', 'ค่า', 'ครับ', 'คับ', 'นะ', 'จ้า', 'จ้ะ', 'ฮะ']
const CLOSERS = [...POLITE_ENDINGS, ...DIALECT.filter((entry) => entry.central === '').map((entry) => entry.word), ...INTERJECTIONS]

const said = (pieces: Piece[], from: number, end: number) => pieces.slice(from, end).map((piece) => piece.text).join('')

/** The text of the phrase that starts at piece `from`: its word pieces up to the next gap. */
function phraseFrom(pieces: Piece[], from: number): { text: string; end: number } {
  let end = from
  while (end < pieces.length && pieces[end].word) end += 1
  return { text: said(pieces, from, end), end }
}

function startsSafeWord(pieces: Piece[], from: number): boolean {
  const phrase = phraseFrom(pieces, from).text // once, not once per safe word: this runs at every piece
  return SAFE_WORDS.some((word) => phrase.startsWith(word))
}

/**
 * The word breaker does not know rude or dialect words and may glue their last letter to the next word:
 * "กูบอก" comes out as "กูบ|อก", "แม่งบอก" as "แม่|งบ|อก" and "ผ่อประวัติ" as "ผ่|อปร|ะ|วัติ".
 * A known word that ends inside a piece is split off, and the rest of the phrase broken again, when the breaker
 * clearly did not know it (rules below). A real word that only starts with the same letters (หีบห่อ, สัดส่วน,
 * กู้เงิน, ผ่อน, ข้อยกเว้น) is left alone.
 */
function unglueKnownWords(input: Piece[]): Piece[] {
  let pieces = input
  for (let index = 0; index < pieces.length; index += 1) {
    if (!pieces[index].word) continue
    const phrase = phraseFrom(pieces, index)
    if (SAFE_WORDS.some((word) => phrase.text.startsWith(word))) continue
    for (const known of KNOWN_BY_LETTER.get(phrase.text.charAt(0)) ?? []) {
      if (!phrase.text.startsWith(known)) continue
      let reach = 0
      for (let at = index; reach < known.length; at += 1) reach += pieces[at].text.length
      if (reach === known.length) break // it ends where a piece ends: the ordinary match hears it
      const rest = splitWords(phrase.text.slice(known.length))
      const left = reach - known.length // letters of the last piece after the word
      const first = rest[0].text.length
      // A rude word is split off when the letters after it, broken again, run on into the next piece (กูบ|อก → กู|บอก);
      // letters that are a whole word on their own stay (สัดส่วน). A dialect word is split off only when the breaker
      // cut the word itself in two and its letters after it are a word (ผ่|อปร|ะ|วัติ → ผ่อ|ประวัติ); ผ่อน is one piece.
      const glued = RUDE_WORDS.includes(known) ? first > left : pieces[index].text.length < known.length && first >= left
      if (!WORD_START.test(rest[0].text) || !glued) continue
      pieces = [...pieces.slice(0, index), { text: known, word: true }, ...rest, ...pieces.slice(phrase.end)]
      break
    }
  }
  return pieces
}

/** The last word of a phrase with a closing particle glued on is split in two, so the particle is heard. */
function unglueParticles(pieces: Piece[]): Piece[] {
  return pieces.flatMap((piece, index) => {
    const endsPhrase = !pieces[index + 1]?.word
    if (!piece.word || !endsPhrase || CENTRAL_WORDS.includes(piece.text)) return [piece]
    const particle = GLUED_PARTICLES.find((word) => piece.text.length > word.length && piece.text.endsWith(word))
    if (!particle) return [piece]
    return [
      { text: piece.text.slice(0, -particle.length), word: true },
      { text: particle, word: true },
    ]
  })
}

const piecesOf = (text: string) => unglueParticles(unglueKnownWords(splitWords(text)))

/**
 * Whether the phrase is over at piece `at`: the end, a gap, or a closing word (polite ending, particle, exclamation).
 * A particle is dropped only where it closes a phrase, because the same letters start names: "ร้านชื่อเจ้าสัวค่ะ"
 * is the shop เจ้าสัว, not Northern เจ้า + สัว, and "ร้านวะรินค่ะ" keeps its วะ.
 */
const closesPhrase = (pieces: Piece[], at: number) =>
  at >= pieces.length || !pieces[at].word || firstMatch(pieces, at, CLOSERS, (word) => word) !== null

/** The rude word starting at piece `index`, unless a safe word (กูเกิล) starts there. */
const rudeAt = (pieces: Piece[], index: number) =>
  pieces[index].word && !startsSafeWord(pieces, index) ? firstMatch(pieces, index, RUDE_WORDS, (word) => word) : null

// firstMatch runs through several word lists at every piece of every sentence, and a phrase can only match where the
// piece starts with its first letter, so each list is grouped by first letter once (list order kept inside a group).
const byFirstLetter = new WeakMap<object, Map<string, unknown[]>>()

function startingWith<T>(list: T[], phrase: (item: T) => string, letter: string): T[] {
  let groups = byFirstLetter.get(list) as Map<string, T[]> | undefined
  if (!groups) {
    groups = new Map()
    for (const item of list) {
      const first = phrase(item).replace(/\s+/g, '').charAt(0)
      if (first) groups.set(first, [...(groups.get(first) ?? []), item])
    }
    byFirstLetter.set(list, groups)
  }
  return groups.get(letter) ?? []
}

function firstMatch<T>(pieces: Piece[], from: number, list: T[], phrase: (item: T) => string): { item: T; end: number } | null {
  const letter = (pieces[from]?.text ?? '').replace(/\s+/g, '').charAt(0)
  // A piece of spaces only may be skipped over by a phrase, so then every entry is tried.
  for (const item of letter ? startingWith(list, phrase, letter) : list) {
    const end = phraseEnd(pieces, from, phrase(item))
    if (end !== -1) return { item, end }
  }
  return null
}

/** The sentence with rude words shown as ***, nothing else changed: for the words appearing live while the merchant talks. */
export function maskRude(text: string): string {
  const pieces = piecesOf(text)
  let shown = ''
  for (let index = 0; index < pieces.length; ) {
    const rude = rudeAt(pieces, index)
    shown += rude ? MASK : pieces[index].text
    index = rude ? rude.end : index + 1
  }
  return shown
}

/** Rude words out, dialect function words into central Thai. Pure; the same sentence always gives the same result. */
export function understandThai(input: string): Understood {
  const pieces = piecesOf(input)
  const regionWords: Record<Region, number> = { isan: 0, north: 0, south: 0 }
  let shown = ''
  let text = ''
  let rude = 0
  let dialectWords = 0
  const heard: DialectWord[] = []
  let afterRude = false // the last word (gaps aside) was a rude word

  for (let index = 0; index < pieces.length; ) {
    const piece = pieces[index]
    const rudeMatch = rudeAt(pieces, index)
    if (rudeMatch) {
      shown += MASK
      text += ' '
      rude += 1
      afterRude = true
      index = rudeMatch.end
      continue
    }
    // An exclamation is dropped right after a swear word ("แม่งเอ๊ยต่อไป") or where it closes a phrase ("โว้ย ต่อไป").
    const exclamation = piece.word ? firstMatch(pieces, index, INTERJECTIONS, (word) => word) : null
    if (exclamation && (afterRude || closesPhrase(pieces, exclamation.end))) {
      shown += said(pieces, index, exclamation.end)
      index = exclamation.end
      continue
    }
    if (piece.word) afterRude = false
    const kept = piece.word ? firstMatch(pieces, index, KEPT_WORDS, (word) => word) : null
    if (kept) {
      const words = said(pieces, index, kept.end)
      shown += words
      text += words
      index = kept.end
      continue
    }
    const dialect = piece.word ? firstMatch(pieces, index, DIALECT_WORDS, (entry) => entry.word) : null
    // A particle inside a phrase is part of a name (เจ้าพ่อหมูกระทะ): kept as said, and not evidence of a region.
    if (dialect && (dialect.item.central !== '' || closesPhrase(pieces, dialect.end))) {
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
