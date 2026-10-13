import type { OpeningHours, Weekday } from '@/types/domain.ts'
import { numbersToDigits } from './thaiNumber.ts'

interface TimeRule {
  pattern: RegExp
  toTime: (match: RegExpMatchArray) => string | null
}

export interface TimeMatch {
  index: number
  length: number
  time: string
}

const pad = (n: number) => String(n).padStart(2, '0')
const at = (hour: number, minute = 0) => (hour <= 24 && minute < 60 ? `${pad(hour % 24)}:${pad(minute)}` : null)
const half = (group: string | undefined) => (group ? 30 : 0)

// Patterns run on text where number words are already digits ("บ่ายสาม" → "บ่าย3").
// Where two patterns overlap, the longer match wins (see findTimes).
const RULES: TimeRule[] = [
  { pattern: /เที่ยงคืน/g, toTime: () => '00:00' },
  { pattern: /(\d{1,2})[:.](\d{2})/g, toTime: (m) => at(Number(m[1]), Number(m[2])) },
  { pattern: /ตี\s*(\d)(ครึ่ง)?/g, toTime: (m) => at(Number(m[1]), half(m[2])) },
  { pattern: /บ่าย\s*(?:(\d{1,2})\s*(?:โมง)?|โมง)(ครึ่ง)?/g, toTime: (m) => at(12 + Number(m[1] ?? 1), half(m[2])) },
  { pattern: /(\d{1,2})\s*โมง\s*เย็น(ครึ่ง)?/g, toTime: (m) => at(12 + Number(m[1]), half(m[2])) },
  { pattern: /(\d)\s*ทุ่ม(ครึ่ง)?/g, toTime: (m) => at(18 + Number(m[1]), half(m[2])) },
  { pattern: /ทุ่ม(?:\s*(\d))?(ครึ่ง)?/g, toTime: (m) => at(18 + Number(m[1] ?? 1), half(m[2])) },
  { pattern: /(\d{1,2})\s*โมง\s*เช้า(ครึ่ง)?/g, toTime: (m) => at(Number(m[1]), half(m[2])) },
  {
    // Plain "โมง": 1–5 means afternoon in everyday speech ("สองโมง" = 14:00); 6–12 as said.
    pattern: /(\d{1,2})\s*โมง(ครึ่ง)?/g,
    toTime: (m) => {
      const hour = Number(m[1])
      if (hour >= 1 && hour <= 5) return at(12 + hour, half(m[2]))
      return hour <= 12 ? at(hour, half(m[2])) : null
    },
  },
  { pattern: /เที่ยง(?:วัน)?(ครึ่ง)?/g, toTime: (m) => at(12, half(m[1])) },
]

const DAY_WORDS: [string, Weekday][] = [
  ['จันทร์', 'mon'],
  ['อังคาร', 'tue'],
  ['พุธ', 'wed'],
  ['พฤหัส', 'thu'],
  ['ศุกร์', 'fri'],
  ['เสาร์', 'sat'],
  ['อาทิตย์', 'sun'],
]

/** Every time expression in the text, in the order it was said. */
export function findTimes(input: string): TimeMatch[] {
  const text = numbersToDigits(input)
  const found: TimeMatch[] = []
  for (const { pattern, toTime } of RULES) {
    for (const match of text.matchAll(pattern)) {
      const time = toTime(match)
      if (time) found.push({ index: match.index ?? 0, length: match[0].length, time })
    }
  }
  found.sort((a, b) => b.length - a.length)
  const kept: TimeMatch[] = []
  for (const candidate of found) {
    const overlaps = kept.some((k) => candidate.index < k.index + k.length && k.index < candidate.index + candidate.length)
    if (!overlaps) kept.push(candidate)
  }
  return kept.sort((a, b) => a.index - b.index)
}

/** First time in the text as "HH:MM", or null. */
export function parseThaiTime(text: string): string | null {
  return findTimes(text)[0]?.time ?? null
}

// A closed verb is "หยุด" or "ปิด" (not the ปิด inside "เปิด"). Days in the clause after it (up to "เปิด"/"ขาย") or in the word just before it are closed.
const CLOSED_VERB = /หยุด|(?<!เ)ปิด/g

/** Days the merchant says are closed ("หยุดวันอาทิตย์" → ['sun'], "วันอาทิตย์หยุด" → ['sun']). */
export function parseClosedDays(text: string): Weekday[] {
  const clauses: string[] = []
  for (const verb of text.matchAll(CLOSED_VERB)) {
    const at = verb.index ?? 0
    const before = text.slice(0, at).split(/\s|เปิด/).pop() ?? ''
    const after = text.slice(at + verb[0].length).split(/เปิด|ขาย/)[0]
    clauses.push(before, after)
  }
  return DAY_WORDS.filter(([word]) => clauses.some((clause) => clause.includes(word))).map(([, day]) => day)
}

/** "สิบโมงเช้าถึงสองทุ่ม" → { open: "10:00", close: "20:00" }. Null unless both times are present. */
export function parseOpeningHours(text: string): OpeningHours | null {
  const [open, close] = findTimes(text)
  if (!open || !close) return null
  return { open: open.time, close: close.time, closedDays: parseClosedDays(text) }
}
