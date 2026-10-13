import { stripParticles } from './particles.ts'

export const STATED_CONFIDENCE = 0.9
export const INFERRED_CONFIDENCE = 0.74
export const GUESSED_CONFIDENCE = 0.6

// words = the merchant names the category; hints = we guess it from a dish.
const CATEGORIES = [
  { label: 'อาหารไทย', words: ['อาหารไทย'], hints: ['น้ำพริก', 'แกง', 'กะเพรา', 'ต้มยำ', 'ผัดไทย'] },
  { label: 'อาหารตามสั่ง', words: ['ตามสั่ง'], hints: ['ข้าวผัด', 'ผัดซีอิ๊ว'] },
  { label: 'ก๋วยเตี๋ยว', words: ['ก๋วยเตี๋ยว'], hints: ['เส้นเล็ก', 'เกาเหลา'] },
  { label: 'เครื่องดื่ม', words: ['เครื่องดื่ม', 'ร้านกาแฟ'], hints: ['กาแฟ', 'ชานม', 'ชาไข่มุก'] },
  { label: 'ของหวาน', words: ['ของหวาน', 'ขนม'], hints: ['บิงซู', 'ไอศกรีม', 'บัวลอย'] },
]

export const CATEGORY_LABELS = CATEGORIES.map((category) => category.label)

export function parseCategory(text: string): { value: string; confidence: number } | null {
  const stated = CATEGORIES.find((category) => category.words.some((word) => text.includes(word)))
  if (stated) return { value: stated.label, confidence: STATED_CONFIDENCE }
  const inferred = CATEGORIES.find((category) => category.hints.some((hint) => text.includes(hint)))
  return inferred ? { value: inferred.label, confidence: INFERRED_CONFIDENCE } : null
}

/** Used right after the companion asked for the category: unknown answers are kept but flagged. */
export function parseCategoryAnswer(text: string): { value: string; confidence: number } | null {
  const known = parseCategory(text)
  if (known) return known
  const value = stripParticles(text).replace(/^ขาย/, '').trim()
  return value ? { value, confidence: GUESSED_CONFIDENCE } : null
}
