import { stripParticles } from './particles.ts'
import { isQuestion } from './question.ts'

export const NAME_CONFIDENCE = 0.93
export const ANSWER_CONFIDENCE = 0.85

// "ร้านชื่อครัวป้าแดงค่ะ", "ร้านของป้าชื่อครัวป้าแดง", "ชื่อร้านว่าครัวป้าแดง".
// The name ends at a particle, a pause, or the next verb (ขาย/อยู่/เปิด).
const NAME_PATTERN = /(?:ร้าน\S*?ชื่อ|ชื่อร้าน)(?:ว่า)?\s*(\S+?)(?=นะ|ค่ะ|ครับ|คะ|ขาย|อยู่|เปิด|\s|$)/

// "ชื่อร้านต้องตั้งยังไง", "ชื่อร้านใส่อะไรดี": a question about the name, not the name.
const NOT_A_NAME = /^(?:ต้อง|จะ|ควร|ใส่|ตั้ง|เขียน|อะไร|ยังไง|ไหน|ดี)/

export function parseStoreName(text: string): { value: string; confidence: number } | null {
  const match = NAME_PATTERN.exec(text)
  if (!match || NOT_A_NAME.test(match[1]) || isQuestion(match[1])) return null
  return { value: match[1], confidence: NAME_CONFIDENCE }
}

// Where a bare name ends: the merchant moves on to what the shop sells, where it is, or when it opens.
const AFTER_NAME = /\s*(?:ขาย|อยู่|เปิด|ร้านอยู่|ร้านขาย)[\s\S]*$/

/**
 * Used right after the companion asked "ร้านชื่ออะไรคะ?": the answer up to the next verb is the name
 * ("ครัวป้าแดง ขายส้มตำ" → ครัวป้าแดง). A question ("ชื่อร้านต้องตั้งยังไง") is not a name.
 */
export function parseStoreNameAnswer(text: string): { value: string; confidence: number } | null {
  const stated = parseStoreName(text)
  if (stated) return stated
  if (isQuestion(text)) return null
  const value = stripParticles(text).replace(/^(?:ชื่อร้าน|ร้านชื่อ|ชื่อ)(?:ว่า)?/, '').replace(AFTER_NAME, '').trim()
  return value ? { value, confidence: ANSWER_CONFIDENCE } : null
}
