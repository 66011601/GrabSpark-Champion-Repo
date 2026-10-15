import { stripParticles } from './particles.ts'
import { isQuestion } from './question.ts'

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

// Regional kitchens: checked before อาหารไทย (น้ำพริกหนุ่ม is Northern before it is "น้ำพริก"), listed after the
// five everyday types so 3/7's first four chips do not change.
const REGIONAL = [
  { label: 'อาหารเหนือ', words: ['อาหารเหนือ'], hints: ['ข้าวซอย', 'ไส้อั่ว', 'แกงฮังเล', 'น้ำพริกหนุ่ม', 'น้ำพริกอ่อง', 'ขนมจีนน้ำเงี้ยว'] },
  { label: 'อาหารอีสาน', words: ['อาหารอีสาน'], hints: ['ส้มตำ', 'ตำบักหุ่ง', 'ตำปู', 'ลาบ', 'ก้อย', 'น้ำตกหมู', 'ปิ้งไก่'] },
  { label: 'อาหารใต้', words: ['อาหารใต้', 'ปักษ์ใต้'], hints: ['แกงไตปลา', 'ขนมจีนแกงใต้', 'คั่วกลิ้ง', 'ข้าวยำ'] },
]
const MATCH_ORDER = [...REGIONAL, ...CATEGORIES]

export const CATEGORY_LABELS = [...CATEGORIES, ...REGIONAL].map((category) => category.label)

export function parseCategory(text: string): { value: string; confidence: number } | null {
  // ขนมจีน is a noodle, not "ขนม" (a sweet): without this it would beat the Southern and Northern dishes.
  const named = text.replaceAll('ขนมจีน', '')
  const stated = MATCH_ORDER.find((category) => category.words.some((word) => named.includes(word)))
  if (stated) return { value: stated.label, confidence: STATED_CONFIDENCE }
  const inferred = MATCH_ORDER.find((category) => category.hints.some((hint) => text.includes(hint)))
  return inferred ? { value: inferred.label, confidence: INFERRED_CONFIDENCE } : null
}

// "ประเภทอาหารมีอะไรบ้าง", "ไม่รู้จะเลือกหมวดไหน", or (just after the companion asked) "มีอะไรบ้าง", "แนะนำหน่อย".
const ABOUT_TYPES = /ประเภท|หมวด|ชนิด/
const WANTS_OPTIONS = /อะไรบ้าง|ไหนบ้าง|มีอะไร|แบบไหน|อันไหน|ไหนดี|อะไรดี|แนะนำ|ไม่รู้|ไม่แน่ใจ|เลือกไม่ถูก|เลือกยังไง|ยังไง/

/** True when the merchant asks which food types there are, instead of naming one. */
export function asksForCategories(text: string, justAsked: boolean): boolean {
  return WANTS_OPTIONS.test(text) && (justAsked || ABOUT_TYPES.test(text))
}

/** Used right after the companion asked for the category: unknown answers are kept but flagged. */
export function parseCategoryAnswer(text: string): { value: string; confidence: number } | null {
  const known = parseCategory(text)
  if (known) return known
  if (isQuestion(text)) return null
  const value = stripParticles(text).replace(/^ขาย/, '').trim()
  return value ? { value, confidence: GUESSED_CONFIDENCE } : null
}
