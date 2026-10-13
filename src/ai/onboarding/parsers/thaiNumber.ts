const DIGIT_WORDS: Record<string, number> = {
  'ศูนย์': 0,
  'หนึ่ง': 1,
  'นึง': 1,
  'เอ็ด': 1,
  'สอง': 2,
  'ยี่': 2,
  'สาม': 3,
  'สี่': 4,
  'ห้า': 5,
  'หก': 6,
  'เจ็ด': 7,
  'แปด': 8,
  'เก้า': 9,
}

const MULTIPLIERS: Record<string, number> = {
  'สิบ': 10,
  'ร้อย': 100,
  'พัน': 1000,
  'หมื่น': 10000,
  'แสน': 100000,
}

// Longest first, so a longer word always wins over a shorter one at the same position.
const WORDS = [...Object.keys(DIGIT_WORDS), ...Object.keys(MULTIPLIERS)].sort((a, b) => b.length - a.length)

// Compounds that begin with a number word but are not numbers, so the scanner must skip them whole.
const NOT_NUMBERS = ['ศูนย์การค้า', 'ศูนย์อาหาร', 'สี่แยก', 'สามแยก', 'พันธุ์', 'ห้าง']

const THAI_DIGITS = '๐๑๒๓๔๕๖๗๘๙'

interface NumberWord {
  word: string
  value: number
  isMultiplier: boolean
}

export interface NumberMatch {
  start: number
  end: number
  value: number
  kind: 'digits' | 'words'
}

/** "๘๙" → "89". One character in, one character out, so positions stay valid. */
export function normalizeThaiDigits(text: string): string {
  return text.replace(/[๐-๙]/g, (digit) => String(THAI_DIGITS.indexOf(digit)))
}

/** The non-number compound starting at this index, if any. */
function notNumberAt(text: string, index: number): string | undefined {
  return NOT_NUMBERS.find((compound) => text.startsWith(compound, index))
}

function wordAt(text: string, index: number): NumberWord | null {
  const word = WORDS.find((candidate) => text.startsWith(candidate, index))
  if (!word) return null
  return word in MULTIPLIERS
    ? { word, value: MULTIPLIERS[word], isMultiplier: true }
    : { word, value: DIGIT_WORDS[word], isMultiplier: false }
}

/** Reads a run of number words ("แปด", "สิบ", "เก้า") as a number, or null if the run is not valid Thai. */
function wordsToNumber(words: NumberWord[]): number | null {
  let total = 0
  let pending: number | null = null
  let lastMultiplier = Infinity
  for (const [index, word] of words.entries()) {
    if (word.isMultiplier) {
      if (word.value >= lastMultiplier) return null // "สิบร้อย"
      total += (pending ?? 1) * word.value
      pending = null
      lastMultiplier = word.value
      continue
    }
    if (pending !== null) return null // two digits in a row: "สองสาม"
    if (word.word === 'ยี่' && words[index + 1]?.word !== 'สิบ') return null
    if (word.word === 'เอ็ด' && lastMultiplier === Infinity) return null
    pending = word.value
  }
  return total + (pending ?? 0)
}

/** Every number in the text, written as digits or spoken as Thai words. */
export function scanNumbers(input: string): NumberMatch[] {
  const text = normalizeThaiDigits(input)
  const matches: NumberMatch[] = []
  let i = 0
  while (i < text.length) {
    const digits = /^\d+/.exec(text.slice(i))
    if (digits) {
      matches.push({ start: i, end: i + digits[0].length, value: Number(digits[0]), kind: 'digits' })
      i += digits[0].length
      continue
    }
    const compound = notNumberAt(text, i)
    if (compound) {
      i += compound.length
      continue
    }
    const words: NumberWord[] = []
    let j = i
    for (let word = wordAt(text, j); word && !notNumberAt(text, j); word = wordAt(text, j)) {
      words.push(word)
      j += word.word.length
    }
    if (words.length === 0) {
      i += 1
      continue
    }
    const value = wordsToNumber(words)
    if (value !== null) matches.push({ start: i, end: j, value, kind: 'words' })
    i = j
  }
  return matches
}

/** "แปดสิบเก้า" → 89, "๘๙ บาท" → 89. Null unless the whole text is one number. */
export function parseThaiNumber(input: string): number | null {
  const core = input.trim().replace(/^฿/, '').replace(/บาท$/, '').trim()
  const normalized = normalizeThaiDigits(core)
  if (/\d\s+\d/.test(normalized)) return null // "89 90": two numbers, not one
  const text = normalized.replace(/\s+/g, '')
  if (!text) return null
  const matches = scanNumbers(text)
  const [only] = matches
  return matches.length === 1 && only.start === 0 && only.end === text.length ? only.value : null
}

/** "สิบโมงถึงสองทุ่ม" → "10โมงถึง2ทุ่ม". Digit runs are kept as written, so "20:00" stays "20:00". */
export function numbersToDigits(input: string): string {
  const text = normalizeThaiDigits(input)
  let out = ''
  let cursor = 0
  for (const match of scanNumbers(text)) {
    const written = match.kind === 'digits' ? text.slice(match.start, match.end) : String(match.value)
    out += text.slice(cursor, match.start) + written
    cursor = match.end
  }
  return out + text.slice(cursor)
}
