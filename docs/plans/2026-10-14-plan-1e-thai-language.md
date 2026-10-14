# Plan 1e — Understanding how merchants really talk — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Every sentence the companion hears (Act 1 and Act 2) first has rude words removed and Isan / Northern / Southern function words turned into central Thai. A bank of 300+ real merchant sentences proves which scenarios work.

**Architecture:** A pure layer in `src/ai/language/` (`understandThai`) runs once inside `hear` in `useVoiceInput`, the single entry point for mic, presenter lines and typed talk. It uses the browser's Thai word breaker (`Intl.Segmenter`). Screens keep their own `interpret` unchanged. A typed sentence corpus runs through the real matchers in tests.

**Tech Stack:** Vite 8, React 19, TypeScript 6, Vitest 5, oxlint. No new dependencies: `Intl.Segmenter` is built into Node 22 and every current browser.

**Spec:** `docs/specs/2026-10-14-thai-language-design.md`

## Global Constraints

- Code style: no semicolons, single quotes, `.ts`/`.tsx` extensions in imports, `@/` alias for `src/`. Short doc comment on exports; comments say *why*.
- `npm test`, `npm run lint` (0 warnings) and `npm run build` (`tsc -b` type-checks tests) pass at the end of every task.
- oxlint: no component file may also export non-components; no state setter called synchronously in an effect body; it runs `react-hooks/exhaustive-deps`.
- `src/ai/**` must not import React. `src/ai/language/**` is pure (no DOM, no network).
- Only function words are converted (yes/no, commands, question words, time, numbers, verbs, place words, pronouns, particles). Names, adjectives and dish names are never converted.
- Rude words never reach a field. The transcript shows them as `***`. Food words (สัตว์, ควาย, ตีน, หอย) are never masked on their own.
- The companion answers in central Thai. It greets once per page session, after it is sure of a region.
- Act 2 files (`src/ai/navigator/**`, `src/screens/act2-grow/**`) are not edited. Their phrases improve only through the shared layer.
- On-screen and spoken text lives in `src/copy/th.ts`. The companion speaks as หนู…ค่ะ.
- Commit after each task, ending the message with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`, then `git push` (branch `thai-language`).

## File map

| File | Status | Responsibility |
|---|---|---|
| `src/ai/language/words.ts` | create | Split a sentence into word pieces; match a phrase over whole pieces |
| `src/ai/language/dialect.ts` | create | Dialect word list (word → central, region, kind) |
| `src/ai/language/rude.ts` | create | Rude words and insult phrases |
| `src/ai/language/understand.ts` | create | `understandThai`, `maskRude` |
| `src/ai/language/region.ts` | create | Session memory of the merchant's region |
| `src/ai/language/greeting.ts` | create | Greeting per region; put it in front of a notice |
| `src/ai/language/corpus/*.ts` | create | The sentence bank and its test |
| `src/components/assistant/useVoiceInput.ts` | modify | Run `understandThai` in `hear`; mask interim words; greeting |
| `src/ai/onboarding/parsers/category.ts` | modify | Regional food types |
| `src/data/landmarks.json` | modify | `ตลาดหลวง` as a match word for ตลาดวโรรส |
| `src/copy/th.ts` | modify | `language` section |
| `README.md` | modify | Demo lines in each dialect |

---

### Task 1: Word pieces

**Files:**
- Create: `src/ai/language/words.ts`
- Test: `src/ai/language/words.test.ts`

**Interfaces:**
- Produces: `interface Piece { text: string; word: boolean }`; `splitWords(text: string): Piece[]` (joining every `text` gives the sentence back); `phraseEnd(pieces: Piece[], from: number, phrase: string): number` (index after the last piece of the phrase starting at `from`, or -1; phrases cover whole pieces only; spaces are ignored on both sides).

- [ ] **Step 1: Write the failing tests**

```ts
import { describe, expect, it } from 'vitest'
import { phraseEnd, splitWords } from './words.ts'

const words = (text: string) => splitWords(text).map((piece) => piece.text)

describe('splitWords', () => {
  it('splits Thai into words and gives the sentence back when joined', () => {
    expect(words('บ่เอาเด้อ')).toEqual(['บ่', 'เอา', 'เด้อ'])
    expect(words('ไอ้เหี้ยต่อไป')).toEqual(['ไอ้', 'เหี้ย', 'ต่อ', 'ไป'])
    const sentence = 'ร้านอยู่กาดหลวง เจ้า'
    expect(words(sentence).join('')).toBe(sentence)
  })

  it('keeps whole words whole', () => {
    expect(words('เหี้ยมโหด')).toEqual(['เหี้ยมโหด'])
    expect(words('บ่อน้ำ')).toEqual(['บ่อน้ำ'])
  })

  it('marks gaps as not words', () => {
    expect(splitWords('ต่อไป เลย').map((piece) => piece.word)).toEqual([true, true, false, true])
  })
})

describe('phraseEnd', () => {
  it('matches a phrase over one or more whole pieces', () => {
    const pieces = splitWords('หรอยจังฮู้') // หรอ | ย | จัง | ฮู้
    expect(phraseEnd(pieces, 0, 'หรอย')).toBe(2)
    expect(phraseEnd(splitWords('ร้านอยู่กาดหลวง'), 2, 'กาด')).toBe(3)
  })

  it('never matches part of a piece', () => {
    expect(phraseEnd(splitWords('บ่อน้ำ'), 0, 'บ่')).toBe(-1)
    expect(phraseEnd(splitWords('เหี้ยมโหด'), 0, 'เหี้ย')).toBe(-1)
  })

  it('ignores spaces inside the phrase and between pieces', () => {
    expect(phraseEnd(splitWords('ไอ้ ควาย'), 0, 'ไอ้ควาย')).toBe(3)
  })
})
```

- [ ] **Step 2: Run to see them fail**

Run: `npx vitest run src/ai/language/words.test.ts`. Expected: FAIL (module missing). If a `splitWords` expectation on segmenter output fails only because ICU splits a word differently on this machine, change the expected pieces to what `Intl.Segmenter` really gives and say so in the report. Do not change the `phraseEnd` expectations.

- [ ] **Step 3: Write `words.ts`**

```ts
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

/**
 * Where `phrase` ends if it starts at piece `from`: the index after its last piece, or -1.
 * A phrase covers whole pieces only (บ่ never matches inside บ่อ). Spaces are ignored on both sides,
 * and a phrase may span several pieces because the breaker splits some dialect words (หรอย → หรอ + ย).
 */
export function phraseEnd(pieces: Piece[], from: number, phrase: string): number {
  const wanted = phrase.replace(/\s+/g, '')
  if (!wanted) return -1
  let joined = ''
  for (let index = from; index < pieces.length; index += 1) {
    joined += pieces[index].text.replace(/\s+/g, '')
    if (joined === wanted) return index + 1
    if (!wanted.startsWith(joined)) return -1
  }
  return -1
}
```

- [ ] **Step 4: Run, then the whole suite**

Run: `npx vitest run src/ai/language/words.test.ts` → PASS. Then `npm test && npm run lint && npm run build`.

- [ ] **Step 5: Commit and push**

```bash
git add src/ai/language/words.ts src/ai/language/words.test.ts
git commit -m "Split Thai sentences into whole words for dialect and rude-word matching

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
git push
```

---

### Task 2: Dialect words, rude words, `understandThai`

**Files:**
- Create: `src/ai/language/dialect.ts`, `src/ai/language/rude.ts`, `src/ai/language/understand.ts`
- Test: `src/ai/language/understand.test.ts`

**Interfaces:**
- Consumes: `splitWords`, `phraseEnd`, `Piece` (Task 1); `stripParticles` from `@/ai/onboarding/parsers/particles.ts`.
- Produces:
  - `type Region = 'isan' | 'north' | 'south'`
  - `interface DialectWord { word: string; central: string | null; region: Region | 'shared'; kind: WordKind; alone?: string }`
  - `DIALECT: DialectWord[]` and `RUDE: string[]`
  - `interface Understood { text: string; shown: string; regionWords: Record<Region, number>; dialectWords: number; onlyRude: boolean }`
  - `understandThai(text: string): Understood` and `maskRude(text: string): string`

- [ ] **Step 1: Write the word lists**

`src/ai/language/dialect.ts`:

```ts
export type Region = 'isan' | 'north' | 'south'
export type WordKind = 'yesNo' | 'verb' | 'question' | 'time' | 'number' | 'place' | 'pronoun' | 'particle' | 'evidence'

/**
 * A dialect word and what it means in central Thai. `central: ''` drops a particle; `central: null` keeps the word
 * as said and only counts as evidence of the region (adjectives that may be part of a name: นัว, ลำ, หรอย).
 * `alone` is what the word means when it is the whole sentence (Northern "เจ้า" on its own is a yes).
 * `shared` words are used in more than one region, so they never tell the region.
 */
export interface DialectWord {
  word: string
  central: string | null
  region: Region | 'shared'
  kind: WordKind
  alone?: string
}

const w = (word: string, central: string | null, region: DialectWord['region'], kind: WordKind, alone?: string): DialectWord =>
  alone === undefined ? { word, central, region, kind } : { word, central, region, kind, alone }

export const DIALECT: DialectWord[] = [
  // yes / no
  w('แม่นแล้ว', 'ใช่แล้ว', 'shared', 'yesNo'),
  w('แม่น', 'ใช่', 'shared', 'yesNo'),
  w('บ่แม่น', 'ไม่ใช่', 'isan', 'yesNo'),
  w('บ่ใจ้', 'ไม่ใช่', 'north', 'yesNo'),
  w('ใจ้', 'ใช่', 'north', 'yesNo'),
  w('ไม่ช่าย', 'ไม่ใช่', 'south', 'yesNo'),
  w('ช่าย', 'ใช่', 'south', 'yesNo'),
  w('บ่', 'ไม่', 'shared', 'yesNo'),
  // verbs
  w('เฮ็ด', 'ทำ', 'isan', 'verb'),
  w('เบิ่ง', 'ดู', 'isan', 'verb'),
  w('เว้า', 'พูด', 'isan', 'verb'),
  w('เอิ้น', 'เรียก', 'isan', 'verb'),
  w('ยะ', 'ทำ', 'north', 'verb'),
  w('ผ่อ', 'ดู', 'north', 'verb'),
  w('ปิ๊ก', 'กลับ', 'north', 'verb'),
  w('กิ๋น', 'กิน', 'north', 'verb'),
  w('อู้', 'พูด', 'north', 'verb'),
  w('แอ่ว', 'เที่ยว', 'north', 'verb'),
  w('แล', 'ดู', 'south', 'verb'),
  w('หลบ', 'กลับ', 'south', 'verb'),
  w('แหลง', 'พูด', 'south', 'verb'),
  // question words
  w('จั่งใด๋', 'อย่างไร', 'isan', 'question'),
  w('จังใด', 'อย่างไร', 'isan', 'question'),
  w('จักบาท', 'กี่บาท', 'isan', 'question'),
  w('จักโมง', 'กี่โมง', 'isan', 'question'),
  w('ไส', 'ไหน', 'isan', 'question'),
  w('หยัง', 'อะไร', 'shared', 'question'),
  w('เท่าใด', 'เท่าไหร่', 'shared', 'question'),
  w('ตางใด', 'ที่ไหน', 'north', 'question'),
  w('จะใด', 'อย่างไร', 'north', 'question'),
  w('พรือ', 'อย่างไร', 'south', 'question'),
  w('ไหร', 'ไหน', 'south', 'question'),
  w('กี่ตัง', 'กี่บาท', 'south', 'question'),
  // time
  w('มื้อนี่', 'วันนี้', 'isan', 'time'),
  w('มื้อนี้', 'วันนี้', 'isan', 'time'),
  w('มื้ออื่น', 'พรุ่งนี้', 'isan', 'time'),
  w('มื้อวาน', 'เมื่อวาน', 'isan', 'time'),
  w('ซู่มื้อ', 'ทุกวัน', 'isan', 'time'),
  w('ทุกมื้อ', 'ทุกวัน', 'isan', 'time'),
  w('ตอนงาย', 'ตอนสาย', 'isan', 'time'),
  w('ตอนแลง', 'ตอนเย็น', 'shared', 'time'),
  w('แลง', 'เย็น', 'shared', 'time'),
  w('วันพูก', 'พรุ่งนี้', 'north', 'time'),
  w('มะวาน', 'เมื่อวาน', 'north', 'time'),
  w('หวันนี้', 'วันนี้', 'south', 'time'),
  w('ต่อเช้า', 'พรุ่งนี้', 'south', 'time'),
  w('ทุกหวัน', 'ทุกวัน', 'south', 'time'),
  // numbers
  w('ซาว', 'ยี่สิบ', 'shared', 'number'),
  w('ฮ้อย', 'ร้อย', 'isan', 'number'),
  // places
  w('ทางพุ้น', 'ทางโน้น', 'isan', 'place'),
  w('พุ้น', 'โน้น', 'isan', 'place'),
  w('กาด', 'ตลาด', 'north', 'place'),
  w('ตี้', 'ที่', 'north', 'place'),
  // pronouns
  w('ข้อย', 'ฉัน', 'isan', 'pronoun'),
  w('ข่อย', 'ฉัน', 'isan', 'pronoun'),
  w('เฮา', 'เรา', 'isan', 'pronoun'),
  w('ฉาน', 'ฉัน', 'south', 'pronoun'),
  // particles
  w('เด้อ', '', 'isan', 'particle'),
  w('เด้', '', 'isan', 'particle'),
  w('แหน่', 'หน่อย', 'isan', 'particle'),
  w('โลด', 'เลย', 'isan', 'particle'),
  w('เนาะ', '', 'shared', 'particle'),
  w('เจ้า', '', 'north', 'particle', 'ใช่'),
  w('เน้อ', '', 'north', 'particle'),
  w('ก่', '', 'north', 'particle'),
  w('แต๊', '', 'north', 'particle'),
  w('หนิ', '', 'south', 'particle'),
  w('ฮู้', '', 'south', 'particle'),
  w('แหละ', '', 'shared', 'particle'),
  w('จัง', '', 'shared', 'particle'),
  // evidence only: kept as said, they may be part of a shop or dish name
  w('นัว', null, 'isan', 'evidence'),
  w('คัก', null, 'isan', 'evidence'),
  w('ลำ', null, 'north', 'evidence'),
  w('หรอย', null, 'south', 'evidence'),
]
```

`src/ai/language/rude.ts`:

```ts
/**
 * Rude words and insult phrases, central and regional, matched on whole words only (Task 1's phraseEnd),
 * so เหี้ยมโหด, หีบ or สัดส่วน are safe. Food words are never listed on their own: สัตว์, ควาย, ตีน and หอย are
 * on menus (อาหารสัตว์, เนื้อควาย, ตีนไก่, หอยทอด); only their insult forms with ไอ้ / อี / บัก are here.
 */
export const RUDE: string[] = [
  'เหี้ย', 'เชี่ย', 'เชี้ย', 'สัส', 'สัด', 'ควย', 'หี', 'แตด', 'เย็ด', 'เยด',
  'แม่ง', 'แม่ม', 'มึง', 'กู', 'ฉิบหาย', 'ชิบหาย', 'ซิบหาย', 'ระยำ', 'เสือก', 'จัญไร',
  'ส้นตีน', 'ดอกทอง', 'อีดอก', 'ห่าราก',
  'ไอ้สัตว์', 'ไอ้สัส', 'ไอ้ควาย', 'อีควาย', 'บักควาย', 'ไอ้ห่า', 'อีห่า', 'บักห่า', 'ไอ้เวร', 'อีเวร',
]
```

- [ ] **Step 2: Write the failing tests**

`src/ai/language/understand.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { maskRude, understandThai } from './understand.ts'

describe('understandThai — dialect', () => {
  it('turns Isan function words into central Thai', () => {
    expect(understandThai('เบิ่งยอดขายแหน่').text).toBe('ดูยอดขายหน่อย')
    expect(understandThai('บ่เอาเด้อ').text).toBe('ไม่เอา')
    expect(understandThai('ร้านอยู่ไส').text).toBe('ร้านอยู่ไหน')
  })

  it('turns Northern and Southern words into central Thai', () => {
    expect(understandThai('ร้านอยู่ตี้กาดหลวงเจ้า').text).toBe('ร้านอยู่ที่ตลาดหลวง')
    expect(understandThai('ปิ๊กหน้าหลักเน้อ').text).toBe('กลับหน้าหลัก')
    expect(understandThai('ทำพรือหนิ').text).toBe('ทำอย่างไร')
    expect(understandThai('ต่อเช้าเปิดกี่โมง').text).toBe('พรุ่งนี้เปิดกี่โมง')
  })

  it('reads ซาว and ฮ้อย as numbers', () => {
    expect(understandThai('ข้าวเหนียวมะม่วงซาวห้าบาท').text).toBe('ข้าวเหนียวมะม่วงยี่สิบห้าบาท')
  })

  it('leaves real central words alone', () => {
    for (const said of ['บ่อน้ำ', 'แม่น้ำ', 'เจ้าของร้าน', 'ลำปาง', 'ลำไย']) expect(understandThai(said).text).toBe(said)
  })

  it('keeps names and adjectives as said, but counts them as evidence', () => {
    const heard = understandThai('ร้านครัวนัวคักขายลาบ')
    expect(heard.text).toBe('ร้านครัวนัวคักขายลาบ')
    expect(heard.regionWords.isan).toBe(2)
  })

  it('reads a lone Northern เจ้า as yes', () => {
    expect(understandThai('เจ้า').text).toBe('ใช่')
  })

  it('counts region words but never shared ones', () => {
    expect(understandThai('บ่แม่นเด้อ').regionWords).toEqual({ isan: 2, north: 0, south: 0 })
    expect(understandThai('บ่').regionWords).toEqual({ isan: 0, north: 0, south: 0 })
    expect(understandThai('บ่').dialectWords).toBe(1)
  })
})

describe('understandThai — rude words', () => {
  it('removes them from what the screens read and shows ***', () => {
    const heard = understandThai('แม่งต่อไปเลย')
    expect(heard.shown).toBe('***ต่อไปเลย')
    expect(heard.text).toBe('ต่อไปเลย')
    expect(heard.onlyRude).toBe(false)
  })

  it('flags a sentence that is only rude words', () => {
    expect(understandThai('ไอ้เหี้ย').onlyRude).toBe(true)
    expect(understandThai('เหี้ยเอ๊ย ค่ะ').onlyRude).toBe(false) // เอ๊ย is a word, so there is something left
  })

  it('never masks food or ordinary words', () => {
    for (const said of ['ขายตีนไก่ทอด', 'เนื้อควายย่าง', 'ร้านขายอาหารสัตว์', 'หอยทอดกระทะร้อน', 'เหี้ยมโหดมาก', 'หีบใส่ของ', 'สัดส่วนกำไร', 'กู้เงินมาเปิดร้าน']) {
      const heard = understandThai(said)
      expect(heard.shown, said).toBe(said)
      expect(heard.text, said).toBe(said)
    }
  })

  it('masks insult forms of food words', () => {
    expect(understandThai('ไอ้ควายต่อไป').shown).toBe('***ต่อไป')
  })

  it('masks interim words for the live transcript', () => {
    expect(maskRude('มึงเปิดเมนู')).toBe('***เปิดเมนู')
  })
})
```

Run: `npx vitest run src/ai/language/understand.test.ts`. Expected: FAIL (module missing).

- [ ] **Step 3: Write `understand.ts`**

```ts
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
```

- [ ] **Step 4: Run, then the whole suite**

Run: `npx vitest run src/ai/language` → PASS. If an expectation fails only because `Intl.Segmenter` splits a word differently (so a list entry never matches), add the entry's other spelling or split form to the list, not a test change; report it. Then `npm test && npm run lint && npm run build`.

- [ ] **Step 5: Commit and push**

```bash
git add src/ai/language
git commit -m "Turn Isan, Northern and Southern function words into central Thai and take rude words out

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
git push
```

---

### Task 3: Region memory, greeting and copy

**Files:**
- Create: `src/ai/language/region.ts`, `src/ai/language/greeting.ts`
- Modify: `src/copy/th.ts` (new `language` section)
- Test: `src/ai/language/region.test.ts`

**Interfaces:**
- Consumes: `Region` (Task 2).
- Produces:
  - `noteRegion(words: Record<Region, number>): Region | null` returns the region only at the moment it becomes sure.
  - `resetRegion(): void` and `regionNow(): Region | null`
  - `greetingFor(region: Region | null): string | null` and `withGreeting(notice: string | null, greeting: string | null): string | null`
  - `th.language = { calm, greet: { isan, north, south } }`

- [ ] **Step 1: Copy**

Add to `src/copy/th.ts`, at the top level of `th`:

```ts
  // Dialects and rude words (spec 2026-10-14-thai-language-design).
  language: {
    calm: 'หนูเข้าใจค่ะ ค่อยๆ ทำไปด้วยกันนะคะ',
    greet: {
      isan: 'สบายดีบ่คะ พูดอีสานได้เลย หนูฟังออกค่ะ',
      north: 'สวัสดีเจ้า อู้คำเมืองได้เลย หนูฟังออกค่ะ',
      south: 'แหลงใต้ได้เลยค่ะ หนูฟังออก',
    },
  },
```

- [ ] **Step 2: Write the failing tests**

```ts
import { afterEach, describe, expect, it } from 'vitest'
import { th } from '@/copy/th.ts'
import { greetingFor, withGreeting } from './greeting.ts'
import { noteRegion, regionNow, resetRegion } from './region.ts'

const none = { isan: 0, north: 0, south: 0 }

afterEach(() => resetRegion())

describe('noteRegion', () => {
  it('is sure after two region words in one sentence, and says so once', () => {
    expect(noteRegion({ ...none, isan: 2 })).toBe('isan')
    expect(noteRegion({ ...none, isan: 3 })).toBeNull()
    expect(regionNow()).toBe('isan')
  })

  it('is sure after the same region in two sentences', () => {
    expect(noteRegion({ ...none, north: 1 })).toBeNull()
    expect(noteRegion({ ...none, north: 1 })).toBe('north')
  })

  it('waits on mixed or empty signals', () => {
    expect(noteRegion(none)).toBeNull()
    expect(noteRegion({ isan: 1, north: 1, south: 0 })).toBeNull()
    expect(regionNow()).toBeNull()
  })
})

describe('greeting', () => {
  it('greets in the region’s style, once, before the notice', () => {
    expect(greetingFor('south')).toBe(th.language.greet.south)
    expect(greetingFor(null)).toBeNull()
    expect(withGreeting('ยังไม่ได้กรอกชื่อร้านค่ะ', 'สวัสดีเจ้า')).toBe('สวัสดีเจ้า ยังไม่ได้กรอกชื่อร้านค่ะ')
    expect(withGreeting(null, 'สวัสดีเจ้า')).toBe('สวัสดีเจ้า')
    expect(withGreeting('x', null)).toBe('x')
  })
})
```

Run: `npx vitest run src/ai/language/region.test.ts`. Expected: FAIL.

- [ ] **Step 3: Write the modules**

`src/ai/language/region.ts`:

```ts
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
```

`src/ai/language/greeting.ts`:

```ts
import { th } from '@/copy/th.ts'
import type { Region } from './dialect.ts'

/** The one-time greeting in the merchant's regional style (the rest of the talk stays central Thai). */
export const greetingFor = (region: Region | null): string | null => (region ? th.language.greet[region] : null)

/** The greeting goes in front of whatever the companion says next. */
export function withGreeting(notice: string | null, greeting: string | null): string | null {
  if (!greeting) return notice
  return notice ? `${greeting} ${notice}` : greeting
}
```

- [ ] **Step 4: Run, then the whole suite; Step 5: Commit and push**

`npx vitest run src/ai/language` → PASS; `npm test && npm run lint && npm run build`.

```bash
git add src/ai/language src/copy/th.ts
git commit -m "Remember the merchant's region and greet once in its style

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
git push
```

---

### Task 4: Wire it into `hear`, regional food types, กาดหลวง

**Files:**
- Modify: `src/components/assistant/useVoiceInput.ts`
- Modify: `src/ai/onboarding/parsers/category.ts` (+ `category.test.ts`)
- Modify: `src/data/landmarks.json` (ตลาดวโรรส `match` gains `"ตลาดหลวง"`)
- Test: `src/ai/language/pipeline.test.ts`

**Interfaces:**
- Consumes: Tasks 2–3.
- Produces:
  - `hear` sends `understandThai(text).text` to `interpret` and shows `.shown`.
  - A sentence that is only rude words gets `th.language.calm` and never reaches `interpret`.
  - An empty `.text` counts as not understood.
  - The first time a region is sure, its greeting goes in front of that turn's notice.
  - Interim and scripted partial transcripts go through `maskRude`.
  - `CATEGORY_LABELS` gains `อาหารอีสาน`, `อาหารเหนือ`, `อาหารใต้` **after** the existing five, because 3/7's chips show the first four. Regional matches are checked **before** อาหารไทย.

- [ ] **Step 1: Failing tests**

`src/ai/onboarding/parsers/category.test.ts`, add:

```ts
  it('knows regional food types and checks them before อาหารไทย', () => {
    expect(parseCategory('ขายข้าวซอยไก่')?.value).toBe('อาหารเหนือ')
    expect(parseCategory('น้ำพริกหนุ่มแคบหมู')?.value).toBe('อาหารเหนือ')
    expect(parseCategory('ร้านส้มตำไก่ย่าง')?.value).toBe('อาหารอีสาน')
    expect(parseCategory('แกงไตปลาขนมจีน')?.value).toBe('อาหารใต้')
    expect(parseCategory('น้ำพริกปลาทู')?.value).toBe('อาหารไทย')
  })

  it('keeps the first four chips as before', () => {
    expect(CATEGORY_LABELS.slice(0, 5)).toEqual(['อาหารไทย', 'อาหารตามสั่ง', 'ก๋วยเตี๋ยว', 'เครื่องดื่ม', 'ของหวาน'])
    expect(CATEGORY_LABELS).toContain('อาหารอีสาน')
  })
```

(Import `CATEGORY_LABELS` if the test file does not yet.)

`src/ai/language/pipeline.test.ts` covers the language layer feeding the real parsers:

```ts
import { describe, expect, it } from 'vitest'
import { businessUpdates } from '@/ai/onboarding/businessTalk.ts'
import { extractProfile } from '@/ai/onboarding/extractProfile.ts'
import { createEmptyProfile } from '@/ai/onboarding/profile.ts'
import { getLandmarks } from '@/services/merchantApi.ts'
import { understandThai } from './understand.ts'

const landmarks = getLandmarks()

describe('language layer → parsers', () => {
  it('reads an Isan price with ซาว', () => {
    const menu = extractProfile(understandThai('ข้าวเหนียวมะม่วงซาวห้าบาทเด้อ').text, { expecting: 'menu', landmarks }).menu?.value
    expect(menu).toEqual([{ name: 'ข้าวเหนียวมะม่วง', priceTHB: 25 }])
  })

  it('finds กาดหลวง said in คำเมือง', () => {
    const updates = businessUpdates(understandThai('ร้านอยู่กาดหลวงเจ้า').text, { expecting: 'location', landmarks, profile: createEmptyProfile() })
    expect(updates.location?.value.text.startsWith('ตลาดวโรรส')).toBe(true)
  })

  it('reads Southern opening hours', () => {
    const hours = extractProfile(understandThai('เปิดเจ็ดโมงเช้าถึงห้าโมงเย็นทุกหวันแหละ').text, { expecting: 'hours', landmarks }).hours?.value
    expect(hours?.open).toBe('07:00')
    expect(hours?.close).toBe('17:00')
  })
})
```

Run: `npx vitest run src/ai/onboarding/parsers/category.test.ts src/ai/language/pipeline.test.ts`. Expected: FAIL. If the menu or hours expectations fail because of an existing parser limit unrelated to dialect (e.g. the menu parser needs "บาท"), fix the parser minimally, or adjust the input sentence to one a merchant would really say. Report which you did.

- [ ] **Step 2: Regional food types**

In `category.ts`, keep `CATEGORIES` (the five) and add:

```ts
// Regional kitchens: checked before อาหารไทย (น้ำพริกหนุ่ม is Northern before it is "น้ำพริก"), listed after the
// five everyday types so 3/7's first four chips do not change.
const REGIONAL = [
  { label: 'อาหารเหนือ', words: ['อาหารเหนือ'], hints: ['ข้าวซอย', 'ไส้อั่ว', 'แกงฮังเล', 'น้ำพริกหนุ่ม', 'น้ำพริกอ่อง', 'ขนมจีนน้ำเงี้ยว'] },
  { label: 'อาหารอีสาน', words: ['อาหารอีสาน'], hints: ['ส้มตำ', 'ตำบักหุ่ง', 'ตำปู', 'ลาบ', 'ก้อย', 'น้ำตกหมู'] },
  { label: 'อาหารใต้', words: ['อาหารใต้', 'อาหารปักษ์ใต้'], hints: ['แกงไตปลา', 'ขนมจีนแกงใต้', 'คั่วกลิ้ง', 'ข้าวยำ'] },
]
const MATCH_ORDER = [...REGIONAL, ...CATEGORIES]

export const CATEGORY_LABELS = [...CATEGORIES, ...REGIONAL].map((category) => category.label)
```

and make `parseCategory` search `MATCH_ORDER` instead of `CATEGORIES`, for both `words` and `hints`.

- [ ] **Step 3: กาดหลวง**

In `src/data/landmarks.json`, the ตลาดวโรรส entry's `match` becomes `["ตลาดวโรรส", "วโรรส", "กาดหลวง", "ตลาดหลวง"]`.

- [ ] **Step 4: `hear`**

In `src/components/assistant/useVoiceInput.ts`:
- Import `understandThai` and `maskRude` from `@/ai/language/understand.ts`, `noteRegion` from `@/ai/language/region.ts`, and `greetingFor` and `withGreeting` from `@/ai/language/greeting.ts`.
- Replace the body of `hear` with:

```ts
  const hear = useCallback(
    (words: string) => {
      if (!guard.current.mounted()) return
      // A scripted or typed line may close with "จ้า" too, just like a spoken one.
      const said = cutAtEndWord(words).text || words
      // Rude words out, dialect into central Thai: every screen reads the same plain sentence.
      const heard = understandThai(said)
      const greeting = greetingFor(noteRegion(heard.regionWords))
      const isCurrent = guard.current.begin()
      setTranscript({ text: heard.shown, final: true })
      setMic('processing')
      window.clearTimeout(thinking.current)
      thinking.current = window.setTimeout(async () => {
        if (!isCurrent()) return
        // Interpreting may take a moment (looking a place up on the map); a newer turn wins.
        const reply: Reply = heard.onlyRude
          ? th.language.calm
          : heard.text
            ? await Promise.resolve(latestInterpret.current(heard.text, isCurrent)).catch(() => false as const)
            : false
        if (!isCurrent()) return
        setNotice(withGreeting(reply === true ? null : reply === false ? th.onboarding.notUnderstood : reply, greeting))
        setMic('idle')
        // When the answer changed nothing the companion has nothing to say, so it just listens again.
        resuming.current = window.setTimeout(() => {
          if (!isSpeaking()) resume.current()
        }, RESUME_MS)
      }, THINKING_MS)
    },
    [setMic],
  )
```

- In `listen`, `onInterim: (text) => setTranscript({ text: maskRude(text), final: false })`.
- In the `demoBus.onSay` effect, wrap the partial callback the same way: `(partial) => setTranscript({ text: maskRude(partial), final: false })`.
- Update the comment above `hear` to mention the language layer.

- [ ] **Step 5: Run everything**

Run the focused tests, then `npm test && npm run lint && npm run build`. Existing tests must still pass. The category label order change is additive.

- [ ] **Step 6: Commit and push**

```bash
git add src/components/assistant/useVoiceInput.ts src/ai/onboarding/parsers src/data/landmarks.json src/ai/language/pipeline.test.ts
git commit -m "Every screen hears plain central Thai: rude words out, dialects in, a greeting once; regional food types

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
git push
```

---

### Task 5: Sentence bank — format, runner and Act 1 sign-up

**Files:**
- Create: `src/ai/language/corpus/types.ts`, `src/ai/language/corpus/screens.ts`, `src/ai/language/corpus/signup.ts`, `src/ai/language/corpus/corpus.test.ts`
- Modify (only if an entry fails): `src/ai/language/dialect.ts`, `src/ai/commands/phrases.ts` (SAY lists), Act 1 parsers under `src/ai/onboarding/parsers/`

**Interfaces:**
- Consumes: `understandThai` (Task 2); `matchCommand` (`@/ai/commands/matchCommand.ts`); `SAY` (`@/ai/commands/phrases.ts`); `businessUpdates` (`@/ai/onboarding/businessTalk.ts`); `extractProfile` (`@/ai/onboarding/extractProfile.ts`); `createEmptyProfile` (`@/ai/onboarding/profile.ts`); `getLandmarks` (`@/services/merchantApi.ts`).
- Produces:
  - `type Said = 'central' | Region`
  - `interface Utterance { say: string; region: Said; expect: Expect; knownGap?: string }`
  - `type Expect` (below)
  - `SCREEN_COMMANDS`
  - `heardBy(utterance): string` (the route the real system takes, for messages)
  - Task 6 adds files that the same runner reads.

- [ ] **Step 1: Types and the screen command lists**

`src/ai/language/corpus/types.ts`:

```ts
import type { SAY } from '@/ai/commands/phrases.ts'
import type { Region } from '@/ai/language/dialect.ts'
import type { ProfileFieldKey } from '@/types/domain.ts'

export type Said = 'central' | Region
export type SayKey = keyof typeof SAY
export type Screen = 'G0' | 'S1' | 'S2_ACCOUNT' | 'S2_PHONE' | 'S3' | 'S4' | 'S5' | 'S6' | 'S7' | 'H2' | 'H3'

/** What one sentence must do in the real system. */
export type Expect =
  | { screen: Screen; command: SayKey | null } // the screen's command list picks this (null = it must not be taken as a command)
  | { step: 'S3' | 'H2' | 'H3'; expecting?: ProfileFieldKey; fields: FieldExpect } // what the step's parser fills
  | { act2: string | null } // Act 2's route: 'confirm', 'control:back', 'open:menu', 'button:<id>', 'intent:sales', or null
  | { masked: boolean } // whether the transcript hides a rude word

export interface FieldExpect {
  storeName?: string
  category?: string
  locationStartsWith?: string
  addressIncludes?: string
  buildingIncludes?: string
  hours?: { open: string; close: string }
  menu?: { name: string; priceTHB: number }[] // each must be in the heard menu
}

/** One real merchant sentence. `knownGap` marks one the layer cannot rescue without editing Act 2 (reported, not failed). */
export interface Utterance {
  say: string
  region: Said
  expect: Expect
  knownGap?: string
}
```

`src/ai/language/corpus/screens.ts`. Mirror each screen's `COMMANDS` **in the same order as the screen file** (read each file under `src/screens/signup/` and `src/screens/home/`):

```ts
import type { Screen, SayKey } from './types.ts'

/** Each listening screen's voice commands, in the order the screen checks them (ties go to the earlier one). */
export const SCREEN_COMMANDS: Record<Screen, SayKey[]> = {
  G0: ['register', 'login'],
  S1: ['food', 'mart', 'next', 'back'],
  S2_ACCOUNT: ['next', 'back'],
  S2_PHONE: ['yes', 'next', 'back'],
  S3: ['next', 'back', 'typeInstead', 'here', 'pin'],
  S4: ['personal', 'company', 'next', 'back'],
  S5: ['shoot', 'next', 'back'],
  S6: ['shoot', 'next', 'back'],
  S7: ['submit', 'consentTick', 'listenSummary', 'back'],
  H2: ['shoot', 'back'],
  H3: ['back'],
}
```

Before committing, check every list against its screen file and fix the order or content to match the screen exactly. Note any difference in the report.

- [ ] **Step 2: The runner**

`src/ai/language/corpus/corpus.test.ts`. Task 6 adds imports for its files to `ALL`.

```ts
import { describe, expect, it } from 'vitest'
import { matchCommand } from '@/ai/commands/matchCommand.ts'
import { SAY } from '@/ai/commands/phrases.ts'
import { businessUpdates } from '@/ai/onboarding/businessTalk.ts'
import { extractProfile } from '@/ai/onboarding/extractProfile.ts'
import { createEmptyProfile } from '@/ai/onboarding/profile.ts'
import { understandThai } from '@/ai/language/understand.ts'
import { getLandmarks } from '@/services/merchantApi.ts'
import { SCREEN_COMMANDS } from './screens.ts'
import { SIGNUP } from './signup.ts'
import type { Expect, Utterance } from './types.ts'

const landmarks = getLandmarks()
const ALL: Utterance[] = [...SIGNUP]

function commandOn(screen: keyof typeof SCREEN_COMMANDS, text: string) {
  return matchCommand(text, SCREEN_COMMANDS[screen].map((id) => ({ id, phrases: SAY[id] })))
}

function check(text: string, expected: Expect, shown: string) {
  if ('command' in expected) {
    expect(commandOn(expected.screen, text)).toBe(expected.command)
  } else if ('fields' in expected) {
    const updates =
      expected.step === 'S3'
        ? businessUpdates(text, { expecting: expected.expecting, landmarks, profile: createEmptyProfile() })
        : extractProfile(text, { expecting: expected.expecting, landmarks })
    const f = expected.fields
    if (f.storeName !== undefined) expect(updates.storeName?.value).toBe(f.storeName)
    if (f.category !== undefined) expect(updates.category?.value).toBe(f.category)
    if (f.locationStartsWith !== undefined) expect(updates.location?.value.text.startsWith(f.locationStartsWith)).toBe(true)
    if (f.addressIncludes !== undefined) expect(updates.address?.value).toContain(f.addressIncludes)
    if (f.buildingIncludes !== undefined) expect(updates.building?.value).toContain(f.buildingIncludes)
    if (f.hours !== undefined) expect(updates.hours?.value).toMatchObject(f.hours)
    if (f.menu !== undefined) for (const dish of f.menu) expect(updates.menu?.value).toContainEqual(expect.objectContaining(dish))
  } else if ('masked' in expected) {
    expect(shown.includes('***')).toBe(expected.masked)
  }
}

describe('sentence bank', () => {
  for (const utterance of ALL.filter((entry) => !entry.knownGap)) {
    it(`[${utterance.region}] ${utterance.say}`, () => {
      const heard = understandThai(utterance.say)
      if (utterance.region !== 'central') expect(heard.dialectWords, 'a dialect sentence must use at least one dialect word').toBeGreaterThan(0)
      check(heard.text, utterance.expect, heard.shown)
    })
  }
})
```

Task 6 adds the `act2` branch and the count tests.

- [ ] **Step 3: Write `signup.ts`**

`export const SIGNUP: Utterance[] = [ … ]`, grouped by screen with a comment per group. Each sentence must be something a merchant would really say. A dialect sentence must use real words of that dialect, at least one of them from `dialect.ts`. Expectations must be what the system **should** do.

Minimum per screen (central / each of isan, north, south):

| Screen / goal | central | isan | north | south |
|---|---|---|---|---|
| G0 register, login (both) | 8 | 2 | 2 | 2 |
| S1 food, mart, next, back | 8 | 2 | 2 | 2 |
| S2_ACCOUNT next, back | 4 | 1 | 1 | 1 |
| S2_PHONE yes, next, back | 6 | 2 | 2 | 2 |
| S3 commands (next, back, typeInstead, here, pin) | 10 | 3 | 3 | 3 |
| S3 fields: store name, category, location (sample places), building, full spoken address | 30 | 5 | 5 | 5 |
| S4 personal, company, next, back | 8 | 2 | 2 | 2 |
| S5 / S6 shoot, next, back | 8 | 2 | 2 | 2 |
| S7 submit, consentTick, listenSummary, back | 8 | 2 | 2 | 2 |
| Negative: shop talk that must **not** be a command (`command: null`) on S3/S1/S7 | 10 | 2 | 2 | 2 |

Every `SCREEN_COMMANDS` key must have at least one non-central sentence. That means 28 keys, each covered on some screen that uses it.

Seed entries to start from (keep them):

```ts
  // G0
  { say: 'ยังไม่เคยสมัครเลยค่ะ', region: 'central', expect: { screen: 'G0', command: 'register' } },
  { say: 'บ่เคยสมัครเด้อ', region: 'isan', expect: { screen: 'G0', command: 'register' } },
  { say: 'เคยสมัครแล้วเจ้า', region: 'north', expect: { screen: 'G0', command: 'login' } },
  // S1
  { say: 'ขายอาหารค่ะ', region: 'central', expect: { screen: 'S1', command: 'food' } },
  // S3 fields
  { say: 'ร้านชื่อครัวป้าแดงค่ะ ขายน้ำพริกปลาทู อาหารไทยบ้านๆ อยู่ลาดพร้าวซอยเจ็ดสิบเอ็ด ตรงข้ามเซเว่น', region: 'central', expect: { step: 'S3', fields: { storeName: 'ครัวป้าแดง', category: 'อาหารไทย', locationStartsWith: 'ลาดพร้าว 71' } } },
  { say: 'ร้านอยู่กาดหลวงเจ้า', region: 'north', expect: { step: 'S3', expecting: 'location', fields: { locationStartsWith: 'ตลาดวโรรส' } } },
  { say: 'ขายข้าวซอยไก่เจ้า', region: 'north', expect: { step: 'S3', expecting: 'category', fields: { category: 'อาหารเหนือ' } } },
  { say: 'ข้อยขายส้มตำเด้อ', region: 'isan', expect: { step: 'S3', expecting: 'category', fields: { category: 'อาหารอีสาน' } } },
  { say: 'สิบสองทับสาม หมู่สี่ ตำบลในเมือง อำเภอเมือง ขอนแก่นเด้อ', region: 'isan', expect: { step: 'S3', fields: { addressIncludes: 'ต.ในเมือง อ.เมืองขอนแก่น จ.ขอนแก่น' } } },
  // S7
  { say: 'ส่งเลยค่ะ', region: 'central', expect: { screen: 'S7', command: 'submit' } },
  // negative
  { say: 'ร้านอยู่ที่นี่ใกล้ตลาดค่ะ', region: 'central', expect: { screen: 'S3', command: null } },
```

- [ ] **Step 4: Make every entry pass**

Run: `npx vitest run src/ai/language/corpus`. For each failing entry, decide:
- **The sentence is unnatural or the expectation is wrong for what the spec wants:** fix the entry and say why in the report. This must be rare.
- **A dialect word is missing or mapped wrong:** fix `dialect.ts`, adding a test in `understand.test.ts` for any new or changed entry.
- **A command phrase is missing:** add it to `SAY` in `phrases.ts`. It must not collide: the existing `locationPhrases.test.ts` and matchCommand tests must still pass.
- **A parser misses a natural phrasing:** fix the parser minimally, with a unit test in its own test file.

`knownGap` is not allowed in this task (Act 1 is ours to fix).

- [ ] **Step 5: Run everything; Step 6: Commit and push**

`npm test && npm run lint && npm run build`.

```bash
git add src/ai
git commit -m "Sentence bank: Act 1 sign-up in central Thai, Isan, Northern and Southern, run through the real parsers

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
git push
```

---

### Task 6: Sentence bank — home, Act 2, rude words, and the counts

**Files:**
- Create: `src/ai/language/corpus/home.ts`, `src/ai/language/corpus/act2.ts`, `src/ai/language/corpus/rude.ts`
- Modify: `src/ai/language/corpus/corpus.test.ts` (add the files, the Act 2 route and the count tests)
- Modify (only if an entry fails): `dialect.ts`, `rude.ts` (the word list), Act 1 parsers. **Never** files under `src/ai/navigator/` or `src/screens/act2-grow/`.

**Interfaces:**
- Consumes: Task 5's types and runner. Act 2 matchers, all exported, none edited:
  - `asksToConfirm`, `CONTROLS`, `matchIntent` from `@/ai/navigator/matchIntent.ts`
  - `matchOpen` from `@/ai/navigator/openPage.ts`
  - `matchButton` from `@/ai/navigator/buttons.ts`
  - `SCRIPTS` from `@/ai/navigator/scripts.ts`
- Produces: `HOME`, `ACT2` and `RUDE_CORPUS` arrays; count tests.

- [ ] **Step 1: The Act 2 route in the runner**

Add to `corpus.test.ts` a function that mirrors `DashboardScreen.tsx`'s `interpret` order. It covers the parts that need no screen state: confirm → control → open → button → intent.

```ts
import { matchCommand } from '@/ai/commands/matchCommand.ts'
import { matchButton } from '@/ai/navigator/buttons.ts'
import { asksToConfirm, CONTROLS, matchIntent } from '@/ai/navigator/matchIntent.ts'
import { matchOpen } from '@/ai/navigator/openPage.ts'
import { SCRIPTS } from '@/ai/navigator/scripts.ts'

/** The route Act 2 takes for a sentence on its home screen, in DashboardScreen's own order. */
function act2Route(text: string): string | null {
  if (asksToConfirm(text)) return 'confirm'
  const control = matchCommand(text, CONTROLS)
  if (control) return `control:${control}`
  const page = matchOpen(text)
  if (page) return `open:${page}`
  const button = matchButton(text)
  if (button) return `button:${button}`
  const intent = matchIntent(text, SCRIPTS)
  return intent ? `intent:${intent}` : null
}
```

In `check`, add `else if ('act2' in expected) expect(act2Route(text)).toBe(expected.act2)`. Read `DashboardScreen.tsx`'s `interpret` and confirm the order matches; if it differs, mirror the screen and note it.

- [ ] **Step 2: Write the three files**

Minimums (central / isan / north / south):

| File / goal | central | isan | north | south |
|---|---|---|---|---|
| `home.ts` H2 menu (dishes with prices, incl. ซาว / ฮ้อย in dialect) | 12 | 4 | 4 | 4 |
| `home.ts` H3 hours (incl. ตอนแลง, ทุกหวัน, ซู่มื้อ) | 10 | 3 | 3 | 3 |
| `home.ts` H2/H3 commands (shoot, back) | 4 | 1 | 1 | 1 |
| `act2.ts` 5 intents (sales, forecast, promo, soldOut, feedback) | 20 | 5 | 5 | 5 |
| `act2.ts` controls (home, back, stop) | 6 | 2 | 2 | 2 |
| `act2.ts` open any home item (≥ 8 different items) | 10 | 2 | 2 | 2 |
| `act2.ts` buttons (≥ 6 different buttons; read `BUTTONS` for ids and names) | 8 | 2 | 2 | 2 |
| `act2.ts` voice must not confirm (`act2: 'confirm'` for ยืนยัน-type sentences, including dialect ones) | 3 | 1 | 1 | 1 |
| `rude.ts` masked (rude words in real sentences, all four regions) | 15 total | | | |
| `rude.ts` not masked (food and ordinary words that look close) | 15 total | | | |

`rude.ts` entries use `{ masked: true | false }`. Spread them over all four regions: at least 3 non-central masked sentences and 3 non-central safe ones.

Seed entries (keep them):

```ts
// home.ts
  { say: 'ข้าวเหนียวมะม่วงซาวห้าบาทเด้อ', region: 'isan', expect: { step: 'H2', expecting: 'menu', fields: { menu: [{ name: 'ข้าวเหนียวมะม่วง', priceTHB: 25 }] } } },
  { say: 'เปิดเจ็ดโมงเช้าถึงห้าโมงเย็นทุกหวันแหละ', region: 'south', expect: { step: 'H3', expecting: 'hours', fields: { hours: { open: '07:00', close: '17:00' } } } },
// act2.ts
  { say: 'ขอดูยอดขายหน่อย', region: 'central', expect: { act2: 'intent:sales' } },
  { say: 'เบิ่งยอดขายแหน่', region: 'isan', expect: { act2: 'intent:sales' } },
  { say: 'ปิ๊กหน้าหลักเจ้า', region: 'north', expect: { act2: 'control:home' } },
  { say: 'ยืนยันเลยเด้อ', region: 'isan', expect: { act2: 'confirm' } },
// rude.ts
  { say: 'แม่งเอ๊ย แอปนี้ใช้ยากจัง ต่อไปเลย', region: 'central', expect: { masked: true } },
  { say: 'ขายตีนไก่ทอดกับเนื้อควายย่าง', region: 'central', expect: { masked: false } },
  { say: 'บักห่า บ่เอาแล้ว', region: 'isan', expect: { masked: true } },
```

- [ ] **Step 3: Count tests**

Add to `corpus.test.ts` (and add `...HOME, ...ACT2, ...RUDE_CORPUS` to `ALL`):

```ts
describe('sentence bank size', () => {
  const count = (region: Utterance['region']) => ALL.filter((entry) => entry.region === region).length

  it('covers at least 300 sentences, 200 central and 40 per dialect', () => {
    expect(ALL.length).toBeGreaterThanOrEqual(300)
    expect(count('central')).toBeGreaterThanOrEqual(200)
    for (const region of ['isan', 'north', 'south'] as const) expect(count(region), region).toBeGreaterThanOrEqual(40)
    expect(RUDE_CORPUS.length).toBeGreaterThanOrEqual(30)
  })

  it('has a dialect sentence for every screen command', () => {
    for (const [screen, keys] of Object.entries(SCREEN_COMMANDS)) {
      for (const key of keys) {
        const covered = ALL.some((entry) => entry.region !== 'central' && 'command' in entry.expect && entry.expect.screen === screen && entry.expect.command === key)
        expect(covered, `${screen} ${key}`).toBe(true)
      }
    }
  })

  it('keeps known Act 2 gaps few and explained', () => {
    const gaps = ALL.filter((entry) => entry.knownGap)
    expect(gaps.length).toBeLessThanOrEqual(10)
    for (const gap of gaps) expect(gap.knownGap?.length ?? 0, gap.say).toBeGreaterThan(10)
  })
})
```

If the "every screen command" test fails for a key only covered on another screen (e.g. `back`), add a dialect sentence for that screen.

- [ ] **Step 4: Make every entry pass**

Same rules as Task 5. The exception: an **Act 2** entry that fails only because Act 2's own phrases or keywords lack a central wording may be marked `knownGap: '<why, and the central phrase Act 2 would need>'`. Never edit Act 2 files. At most 10 gaps. List every gap in the report for the teammate.

- [ ] **Step 5: Run everything; Step 6: Commit and push**

`npm test && npm run lint && npm run build`.

```bash
git add src/ai
git commit -m "Sentence bank: menu, hours, Act 2 and rude words; at least 300 sentences across four regions

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
git push
```

---

### Task 7: README demo lines

**Files:**
- Modify: `README.md`

- [ ] **Step 1:** In `README.md`'s "Presenting the demo" list, after the location bullet, add:

```markdown
- **Dialects and rude words:** the companion understands Isan, Northern (คำเมือง) and Southern function words and answers in central Thai, with one greeting in the merchant's style. Try in the panel's "พูดเอง" box on 3/7: `ข้อยขายส้มตำเด้อ`, `ร้านอยู่กาดหลวงเจ้า`; on Home → menu: `ข้าวเหนียวมะม่วงซาวห้าบาทเด้อ`; in Act 2: `เบิ่งยอดขายแหน่`. Rude words show as *** and never reach a field (`แม่งเอ๊ย ต่อไปเลย`). The sentence bank in `src/ai/language/corpus/` lists every sentence that is tested.
```

and add `docs/specs/2026-10-14-thai-language-design.md` to the "Design:" line. Do not touch the README's first lines (a teammate's text).

- [ ] **Step 2:** `npm test && npm run lint && npm run build`, then commit and push:

```bash
git add README.md
git commit -m "README: dialect and rude-word demo lines

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
git push
```

The controller then checks in the browser. Use the panel's "พูดเอง" box with:
- one sentence per region on 3/7, the menu, the hours and Act 2, and check that the greeting is said once;
- one rude-only sentence, which should get the calm reply;
- one rude + command sentence, which should do the command and show ***.

---

## Self-review (done while writing)

- **Spec coverage:**
  - §2 flow → Tasks 2–4
  - §3 modules → Tasks 1–3
  - §3.1 conversion rules, food types and กาดหลวง → Tasks 2 and 4
  - §3.2 rude words → Task 2
  - §3.3 greeting → Tasks 3–4
  - §4 integration → Task 4
  - §6 corpus and tests → Tasks 5–6
  - browser check → Task 7
  - §5 limits respected (no dialect replies, no form-box filtering, no LLM)
- **Deliberate details to raise in review:**
  - `onlyRude` ignores central particles, so "เหี้ยเอ๊ย ค่ะ" still counts as having content (เอ๊ย is a word).
  - Act 2 sentences that need Act 2's own wording are allowed as `knownGap` (≤ 10) and reported rather than patched.
- **Names used across tasks:** `Piece`, `splitWords`, `phraseEnd`, `Region`, `DialectWord`, `DIALECT`, `RUDE`, `Understood`, `understandThai`, `maskRude`, `noteRegion`, `resetRegion`, `regionNow`, `greetingFor`, `withGreeting`, `Utterance`, `Expect`, `SCREEN_COMMANDS`, `SIGNUP`, `HOME`, `ACT2`, `RUDE_CORPUS`. Each is defined once, in the task named in its Interfaces block.
