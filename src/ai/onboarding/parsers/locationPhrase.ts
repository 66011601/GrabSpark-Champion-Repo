import { stripParticles } from './particles.ts'
import { numbersToDigits } from './thaiNumber.ts'

const MIN_LENGTH = 3

// "…อยู่ลาดพร้าวซอยเจ็ดสิบเอ็ด ตรงข้ามเซเว่น เปิดสิบโมง…": the place starts after อยู่ and ends
// where the merchant moves on to hours, dishes or a phone number.
const AFTER_VERB = /อยู่(?:ที่|ตรง|แถว|ใน)?\s*(.+?)(?=\s*(?:เปิด|ขาย|เมนู|เบอร์|โทร)|$)/

/**
 * The words that say where the shop is, ready to look up on a map, or null when the merchant
 * did not mention a place. With `isAnswer` (the companion just asked where the shop is) the whole
 * sentence is the place.
 */
export function locationPhrase(text: string, isAnswer: boolean): string | null {
  const said = stripParticles(text)
  const stated = AFTER_VERB.exec(said)?.[1]
  const phrase = stated ?? (isAnswer ? said : null)
  if (!phrase) return null
  const place = stripParticles(numbersToDigits(phrase))
  return place.length >= MIN_LENGTH ? place : null
}
