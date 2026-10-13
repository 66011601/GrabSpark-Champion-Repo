import { stripParticles } from './particles.ts'

export const NAME_CONFIDENCE = 0.93
export const ANSWER_CONFIDENCE = 0.85

// "ร้านชื่อครัวป้าแดงค่ะ", "ร้านของป้าชื่อครัวป้าแดง", "ชื่อร้านว่าครัวป้าแดง".
// The name ends at a particle, a pause, or the next verb (ขาย/อยู่/เปิด).
const NAME_PATTERN = /(?:ร้าน\S*?ชื่อ|ชื่อร้าน)(?:ว่า)?\s*(\S+?)(?=นะ|ค่ะ|ครับ|คะ|ขาย|อยู่|เปิด|\s|$)/

export function parseStoreName(text: string): { value: string; confidence: number } | null {
  const match = NAME_PATTERN.exec(text)
  return match ? { value: match[1], confidence: NAME_CONFIDENCE } : null
}

/** Used right after the companion asked "ร้านชื่ออะไรคะ?": the whole answer is the name. */
export function parseStoreNameAnswer(text: string): { value: string; confidence: number } | null {
  const stated = parseStoreName(text)
  if (stated) return stated
  const value = stripParticles(text).replace(/^ชื่อ(?:ว่า)?/, '').trim()
  return value ? { value, confidence: ANSWER_CONFIDENCE } : null
}
